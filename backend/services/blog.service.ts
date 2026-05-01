// backend/services/blog.service.ts
import crypto from "node:crypto";
import { admin, firestore, bucket } from "../lib/firebase.js";
import { clientHash, isAllowedImageMime } from "../domain/blog.validators.js";
import { HttpError, badRequest } from "../utils/httpErrors.js";
import { queueBlogNotificationJob } from "./blogNotification.service.js";

const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

type LikePostResult =
  | { ok: false; status: 404; error: "not_found" }
  | { ok: true; already: boolean };

type UnlikePostResult =
  | { ok: false; status: 404; error: "not_found" }
  | { ok: true; already?: true; removed?: boolean };

type BlogPostPatch = Partial<{
  image: string;
  texts: unknown;
}>;

type UploadableBlogFile = {
  mimetype: string;
  buffer: Buffer;
};

export async function likePost({
  postId,
  clientId,
}: {
  postId: string;
  clientId: string;
}): Promise<LikePostResult> {
  const h = clientHash(clientId);
  if (!h) throw new HttpError(500, "missing_likes_salt");

  const postRef = firestore.collection("blogPosts").doc(postId);
  const likeRef = postRef.collection("likes").doc(h);

  const out = await firestore.runTransaction<LikePostResult>(async (tx) => {
    const [postSnap, likeSnap] = await Promise.all([
      tx.get(postRef),
      tx.get(likeRef),
    ]);

    if (!postSnap.exists) return { ok: false, status: 404, error: "not_found" };
    if (likeSnap.exists) return { ok: true, already: true };

    tx.set(likeRef, { createdAt: serverTs(), v: 1 });
    tx.update(postRef, {
      likes: admin.firestore.FieldValue.increment(1),
      updatedAt: serverTs(),
    });

    return { ok: true, already: false };
  });

  return out;
}

export async function unlikePost({
  postId,
  clientId,
}: {
  postId: string;
  clientId: string;
}): Promise<UnlikePostResult> {
  const h = clientHash(clientId);
  if (!h) throw new HttpError(500, "missing_likes_salt");

  const postRef = firestore.collection("blogPosts").doc(postId);
  const likeRef = postRef.collection("likes").doc(h);

  const out = await firestore.runTransaction<UnlikePostResult>(async (tx) => {
    const [postSnap, likeSnap] = await Promise.all([
      tx.get(postRef),
      tx.get(likeRef),
    ]);

    if (!postSnap.exists) return { ok: false, status: 404, error: "not_found" };
    if (!likeSnap.exists) return { ok: true, already: true, removed: false };

    tx.delete(likeRef);
    tx.update(postRef, {
      likes: admin.firestore.FieldValue.increment(-1),
      updatedAt: serverTs(),
    });

    return { ok: true, removed: true };
  });

  return out;
}

export async function listPosts({
  limit = 200,
}: {
  limit?: number;
} = {}): Promise<Array<FirebaseFirestore.DocumentData & { id: string }>> {
  const snap = await firestore
    .collection("blogPosts")
    .orderBy("createdAt", "desc")
    .limit(Math.min(Math.max(Number(limit) || 200, 1), 500))
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createPost({
  imageUrl,
  texts,
  triggeredByUid,
}: {
  imageUrl: string;
  texts: unknown;
  triggeredByUid?: string | null;
}) {
  const ref = firestore.collection("blogPosts").doc();
  await ref.set({
    image: imageUrl,
    texts,
    likes: 0,
    createdAt: serverTs(),
    updatedAt: serverTs(),
    createdByUid: triggeredByUid || null,
  });

  // ✅ on queue le job et on récupère son id
  const job = await queueBlogNotificationJob({
    triggeredByUid: triggeredByUid || null,
  });

  return { id: ref.id, jobId: job?.jobId || null };
}

export async function updatePost({
  postId,
  patch,
}: {
  postId: string;
  patch: BlogPostPatch;
}) {
  await firestore
    .collection("blogPosts")
    .doc(postId)
    .set({ ...patch, updatedAt: serverTs() }, { merge: true });
  return { ok: true };
}

export async function deletePost({ postId }: { postId: string }) {
  const ref = firestore.collection("blogPosts").doc(postId);

  // supprime aussi likes (batch chunk)
  const likesSnap = await ref.collection("likes").get();
  let batch = firestore.batch();
  let op = 0;

  for (const d of likesSnap.docs) {
    batch.delete(d.ref);
    op++;
    if (op >= 450) {
      await batch.commit();
      batch = firestore.batch();
      op = 0;
    }
  }

  batch.delete(ref);
  await batch.commit();
  return { ok: true };
}

export async function uploadBlogImage({
  file,
}: {
  file: UploadableBlogFile | null | undefined;
}) {
  if (!file) throw badRequest("missing_file");
  if (!isAllowedImageMime(file.mimetype)) throw badRequest("bad_mime");

  const ext =
    file.mimetype === "image/png"
      ? "png"
      : file.mimetype === "image/webp"
      ? "webp"
      : "jpg";

  const name = `blog/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storageFile = bucket.file(name);

  const token = crypto.randomUUID();

  await storageFile.save(file.buffer, {
    resumable: false,
    metadata: {
      contentType: file.mimetype,
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(name);
  const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

  return { ok: true, imageUrl, path: name };
}
