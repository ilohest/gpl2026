<!-- src/components/admin/AdminSectionSkeleton.vue -->
<template>
  <div class="space-y-4">
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div
          class="flex items-center gap-2 min-w-0"
        >
          <Skeleton
            width="12rem"
            height="1rem"
          />
        </div>
      </template>
      <template #content>
        <div class="space-y-3">
          <Skeleton
            width="40%"
            height="1.75rem"
          />
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Skeleton
              width="100%"
              height="4.25rem"
            />
            <Skeleton
              width="100%"
              height="4.25rem"
            />
            <Skeleton
              width="100%"
              height="4.25rem"
            />
          </div>
          <Skeleton
            width="100%"
            height="10rem"
          />
        </div>
      </template>
    </Card>

    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #content>
        <div class="space-y-2">
          <Skeleton
            width="30%"
            height="0.9rem"
          />
          <Skeleton
            width="85%"
            height="0.9rem"
          />
          <Skeleton
            width="70%"
            height="0.9rem"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from "primevue/card";
</script>
