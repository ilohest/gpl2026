<!-- src/pages/AdminPage.vue -->
<template>
  <div class="admin-shell max-w-[1400px] mx-auto">
    <div v-if="booting" class="max-w-md mx-auto"></div>
    <div v-else-if="!authed" class="max-w-md mx-auto"></div>
    <!-- DASHBOARD -->
    <div v-else class="admin-layout">
      <aside class="admin-sidebar hidden min-[1025px]:block">
        <div class="admin-sidebar__brand">
          <p class="admin-sidebar__eyebrow">{{ t("adminlogin.title") }}</p>
        </div>
        <div class="admin-sidebar__links">
          <button
            v-for="item in navItems"
            :key="item.key"
            type="button"
            class="admin-nav-link"
            :class="{ 'is-active': isMenuItemActive(item.key) }"
            @click="openSection(item.key)"
          >
            <span class="inline-flex items-center gap-2">
              <i class="text-sm" :class="item.icon" aria-hidden="true"></i>
              <span>{{ item.label }}</span>
            </span>
          </button>
        </div>
      </aside>
      <div class="admin-content">
        <div
          class="min-[1025px]:hidden sticky top-0 z-10 bg-primary/95 backdrop-blur border-b border-black/10 px-4 py-3 mb-4"
        >
          <p class="text-[11px] uppercase tracking-wide opacity-60">
            {{ t("header.admin", "Admin") }}
          </p>
          <p class="text-base font-semibold leading-tight truncate">
            {{ currentNavLabel }}
          </p>
        </div>
        <!-- ============================ -->
        <!--           BENTOS             -->
        <!-- ============================ -->
        <div v-if="!currentSection" class="flex flex-col gap-4">
          <div
            v-if="dashboardLoading"
            class="admin-bentos-grid grid grid-cols-1 md:grid-cols-2 min-[1025px]:grid-cols-4 gap-4 order-1"
          >
            <!-- RSVP -->
            <Card
              v-if="canReadRsvp"
              class="md:col-span-1 min-[1025px]:col-span-2 relative admin-bento-card"
            >
              <template #title>
                <Skeleton width="10rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="6rem" height="2.5rem" class="mb-2" />
                <Skeleton width="12rem" height="0.9rem" class="mb-4" />
                <div class="grid grid-cols-3 gap-2">
                  <Skeleton width="100%" height="3.25rem" />
                  <Skeleton width="100%" height="3.25rem" />
                  <Skeleton width="100%" height="3.25rem" />
                </div>
              </template>
            </Card>

            <!-- WEDDING PLANNER -->
            <Card
              v-if="canReadPlanner"
              class="md:col-span-1 min-[1025px]:col-span-2 relative admin-bento-card"
            >
              <template #title>
                <Skeleton width="11rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="5rem" height="2.5rem" class="mb-2" />
                <Skeleton width="14rem" height="0.9rem" class="mb-4" />
                <Skeleton width="100%" height="7.5rem" />
              </template>
            </Card>

            <!-- BUDGET CONTROL -->
            <Card
              v-if="canReadFinances"
              class="md:col-span-1 min-[1025px]:col-span-2 relative admin-bento-card"
            >
              <template #title>
                <Skeleton width="10rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="6rem" height="2.5rem" class="mb-2" />
                <Skeleton width="14rem" height="0.9rem" class="mb-4" />
                <div class="grid grid-cols-2 gap-2">
                  <Skeleton width="100%" height="3.25rem" />
                  <Skeleton width="100%" height="3.25rem" />
                </div>
              </template>
            </Card>

            <!-- COUNTDOWN -->
            <Card class="admin-bento-card admin-bento-card--static">
              <template #title>
                <Skeleton width="9rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="5rem" height="2.5rem" class="mb-2" />
                <Skeleton width="14rem" height="0.9rem" />
              </template>
            </Card>

            <!-- TABLE PLAN -->
            <Card v-if="canReadSeating" class="relative admin-bento-card">
              <template #title>
                <Skeleton width="10rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="5rem" height="2.5rem" class="mb-2" />
                <Skeleton width="12rem" height="0.9rem" class="mb-4" />
                <Skeleton width="100%" height="3.25rem" />
              </template>
            </Card>

            <!-- MENUS -->
            <Card
              v-if="canReadMenus"
              class="relative admin-bento-card md:col-span-1 min-[1025px]:col-span-2"
            >
              <template #title>
                <Skeleton width="8.5rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="5rem" height="2.5rem" class="mb-2" />
                <Skeleton width="12rem" height="0.9rem" class="mb-4" />
                <div class="grid grid-cols-3 gap-2">
                  <Skeleton width="100%" height="3.25rem" />
                  <Skeleton width="100%" height="3.25rem" />
                  <Skeleton width="100%" height="3.25rem" />
                </div>
              </template>
            </Card>

            <!-- PLAYLIST -->
            <Card
              v-if="canReadPlaylist"
              class="relative admin-bento-card md:col-span-1 lg:col-span-1"
            >
              <template #title>
                <Skeleton width="8rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="5rem" height="2.5rem" class="mb-2" />
                <Skeleton width="12rem" height="0.9rem" class="mb-4" />
                <Skeleton width="100%" height="7.5rem" />
              </template>
            </Card>

            <!-- AGENDA -->
            <Card
              v-if="canReadAgenda"
              class="relative admin-bento-card md:col-span-1 lg:col-span-1"
            >
              <template #title>
                <Skeleton width="8rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="5rem" height="2.5rem" class="mb-2" />
                <Skeleton width="12rem" height="0.9rem" class="mb-4" />
                <Skeleton width="100%" height="7.5rem" />
              </template>
            </Card>

            <!-- EMAIL BLAST -->
            <Card v-if="canAccessEmail" class="relative admin-bento-card">
              <template #title>
                <Skeleton width="9rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="100%" height="3.25rem" class="mb-2" />
                <Skeleton width="100%" height="7.5rem" />
              </template>
            </Card>

            <!-- BLOG -->
            <Card v-if="canWriteBlog" class="relative admin-bento-card">
              <template #title>
                <Skeleton width="7rem" height="1rem" />
              </template>
              <template #content>
                <Skeleton width="100%" height="3.25rem" class="mb-3" />
                <Skeleton width="100%" height="9rem" />
              </template>
            </Card>
          </div>
          <div
            v-else
            class="admin-bentos-grid grid grid-cols-1 md:grid-cols-2 min-[1025px]:grid-cols-4 gap-4 order-1"
          >
            <!-- RSVP -->
            <Card
              v-if="canReadRsvp"
              class="md:col-span-1 min-[1025px]:col-span-2 relative admin-bento-card"
            >
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-users" aria-hidden="true"></i>
                    {{ t("admin.bento.rsvp_title") }}
                  </p>
                </div>
              </template>
              <template #content>
                <div class="admin-rsvp-layout">
                  <div class="admin-rsvp-layout__left">
                    <!-- TOTAL PERSONNES PRESENTES (PRIMARY + PLUS_ONE) -->
                    <p class="admin-rsvp-total">
                      {{ totalPresent }}
                    </p>
                    <p class="admin-rsvp-total-label">
                      {{ t("admin.stats.total_people") }}
                    </p>
                    <div class="admin-rsvp-metrics">
                      <div class="admin-rsvp-metric">
                        <span class="admin-rsvp-metric__label">{{
                          t("admin.bento.rsvp_plusones")
                        }}</span>
                        <strong class="admin-rsvp-metric__value">{{
                          rsvpSummary.plusOnes
                        }}</strong>
                      </div>
                      <div class="admin-rsvp-metric">
                        <span class="admin-rsvp-metric__label">{{
                          t("admin.bento.rsvp_transport")
                        }}</span>
                        <strong class="admin-rsvp-metric__value">{{
                          rsvpSummary.transport
                        }}</strong>
                      </div>
                      <div class="admin-rsvp-metric">
                        <span class="admin-rsvp-metric__label">{{
                          t("admin.bento.rsvp_diet")
                        }}</span>
                        <strong class="admin-rsvp-metric__value">{{
                          rsvpSummary.dietYes
                        }}</strong>
                      </div>
                    </div>
                  </div>

                  <div class="admin-rsvp-layout__right">
                    <div class="admin-rsvp-donut-wrap">
                      <div
                        class="admin-rsvp-donut"
                        :style="rsvpYesNoDonutStyle"
                      >
                        <span>{{ rsvpYesRate }}%</span>
                      </div>
                      <div class="admin-rsvp-donut-legend">
                        <p>
                          <span class="dot dot-ok"></span>
                          {{ t("common.yes") }} · {{ rsvpAcceptedCount }}
                        </p>
                        <p>
                          <span class="dot dot-no"></span>
                          {{ t("common.no") }} · {{ rsvpDeclinedCount }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div v-if="rsvpSummary.lastResponse" class="admin-rsvp-last">
                    <p class="admin-rsvp-last__label">
                      {{ t("admin.bento.rsvp_last") }}
                    </p>
                    <p class="admin-rsvp-last__value">
                      <strong>{{
                        rsvpSummary.lastResponse.primaryFullName
                      }}</strong>
                      <span v-if="rsvpSummary.lastResponse.guestsCount">
                        · {{ rsvpSummary.lastResponse.guestsCount }}
                        {{ t("admin.bento.rsvp_last_guests") }}
                      </span>
                      –
                      <span>
                        {{
                          rsvpSummary.lastResponse.attending === true
                            ? t("common.yes")
                            : rsvpSummary.lastResponse.attending === false
                              ? t("common.no")
                              : "—"
                        }}
                      </span>
                    </p>
                  </div>
                </div>
                <div class="admin-bento-cta">
                  <Button
                    size="small"
                    class="admin-bento-cta__btn"
                    :label="t('admin.bento.open_section')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    @click.stop="openRsvp"
                  />
                </div>
              </template>
            </Card>
            <!-- WEDDING PLANNER -->
            <Card
              v-if="canReadPlanner"
              class="md:col-span-1 min-[1025px]:col-span-2 relative admin-bento-card"
            >
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-sparkles" aria-hidden="true"></i>
                    {{ t("admin.planner.title") }}
                  </p>
                </div>
              </template>
              <template #content>
                <p class="admin-rsvp-total">
                  {{ plannerSummary.pendingCount || 0 }}
                </p>
                <p class="admin-rsvp-total-label">
                  {{ t("admin.bento.planner_pending") }}
                </p>
                <div
                  v-if="plannerHighlights.length"
                  class="admin-timeline admin-timeline--compact"
                >
                  <div
                    v-for="item in plannerHighlights"
                    :key="item.key"
                    class="admin-timeline__item"
                  >
                    <Tag
                      :value="plannerPriorityLabel(item.priority)"
                      :severity="plannerPrioritySeverity(item.priority)"
                    />
                    <div class="admin-timeline__body">
                      <p class="admin-timeline__title">{{ item.title }}</p>
                      <p class="admin-timeline__meta">{{ item.meta }}</p>
                    </div>
                  </div>
                </div>
                <p v-else class="text-xs opacity-70">
                  {{ t("admin.bento.none") }}
                </p>
                <div class="admin-bento-cta">
                  <Button
                    size="small"
                    class="admin-bento-cta__btn"
                    :label="t('admin.bento.open_section')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    @click.stop="openPlanner"
                  />
                </div>
              </template>
            </Card>
            <!-- BUDGET CONTROL -->
            <Card
              v-if="canReadFinances"
              class="md:col-span-1 min-[1025px]:col-span-2 relative admin-bento-card"
            >
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-wallet" aria-hidden="true"></i>
                    {{ t("admin.nav.budget") }}
                  </p>
                </div>
              </template>
              <template #content>
                <div class="admin-finance-layout">
                  <div class="admin-finance-layout__left">
                    <p class="admin-rsvp-total">{{ financeUsedPct }}%</p>
                    <p class="admin-rsvp-total-label">
                      {{ t("admin.bento.finances_spent") }}
                    </p>
                    <div class="admin-rsvp-metric admin-rsvp-metric--boxed">
                      <span class="admin-rsvp-metric__label">{{
                        t("admin.finances.gifts_total", "Regalos")
                      }}</span>
                      <strong class="admin-rsvp-metric__value">{{
                        formatMoney(financesSummary.giftsTotal)
                      }}</strong>
                    </div>
                  </div>
                  <div class="admin-finance-layout__right">
                    <div class="admin-finance-donut-wrap">
                      <div
                        class="admin-finance-donut"
                        :style="financeDonutStyle"
                      >
                        <span>{{ financeUsedPct }}%</span>
                      </div>
                      <div class="admin-finance-donut-legend">
                        <p>
                          <span class="dot dot-finance-used"></span>
                          {{ t("admin.bento.finances_spent") }}
                          ({{ formatMoney(financesSummary.spentTotal) }})
                        </p>
                        <p>
                          <span class="dot dot-finance-remaining"></span>
                          {{ t("admin.bento.finances_remaining") }}
                          ({{ formatMoney(financesSummary.remaining) }})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="admin-bento-cta">
                  <Button
                    size="small"
                    class="admin-bento-cta__btn"
                    :label="t('admin.bento.open_section')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    @click.stop="openFinances"
                  />
                </div>
              </template>
            </Card>
            <!-- COUNTDOWN -->
            <Card class="admin-bento-card admin-bento-card--static self-start">
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-clock" aria-hidden="true"></i>
                    {{ t("admin.bento.countdown_title") }}
                    {{ weddingConfig.couple.brideFirstName[0] }}
                    +
                    {{ weddingConfig.couple.groomFirstName[0] }}
                  </p>
                </div>
              </template>
              <template #content>
                <p class="admin-rsvp-total">
                  {{ countdownDays }}
                </p>
                <p class="admin-rsvp-total-label">
                  {{ t("admin.bento.countdown_days_left") }}
                </p>
                <div class="flex items-baseline justify-center gap-3">
                  <p class="opacity-70 text-xl text-right whitespace-nowrap">
                    {{ weddingDateLabel }}
                  </p>
                </div>
              </template>
            </Card>
            <!-- TABLE PLAN -->
            <Card v-if="canReadSeating" class="relative admin-bento-card">
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-map" aria-hidden="true"></i>
                    {{ t("admin.seating.title") }}
                  </p>
                </div>
              </template>
              <template #content>
                <p class="admin-rsvp-total">
                  {{ totalTables }}
                </p>
                <p class="admin-rsvp-total-label">
                  {{ t("admin.bento.seating_tables") }}
                </p>
                <div class="admin-rsvp-metric admin-rsvp-metric--boxed">
                  <span class="admin-rsvp-metric__label">{{
                    t("admin.bento.seating_unassigned")
                  }}</span>
                  <strong class="admin-rsvp-metric__value">{{
                    unassignedCount
                  }}</strong>
                </div>
                <div class="admin-bento-cta">
                  <Button
                    size="small"
                    class="admin-bento-cta__btn"
                    :label="t('admin.bento.open_section')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    @click.stop="openSeating"
                  />
                </div>
              </template>
            </Card>
            <!-- MENUS -->
            <Card
              v-if="canReadMenus"
              class="relative admin-bento-card md:col-span-1 min-[1025px]:col-span-2"
            >
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-list" aria-hidden="true"></i>
                    {{ t("admin.menus.title") }}
                  </p>
                </div>
              </template>
              <template #content>
                <p class="admin-rsvp-total">
                  {{ menusSummary.activeCount || 0 }}
                </p>
                <p class="admin-rsvp-total-label">
                  {{ t("admin.bento.menus_active") }}
                </p>
                <div class="admin-menus-metrics">
                  <div class="admin-rsvp-metric">
                    <span class="admin-rsvp-metric__label">{{
                      t("admin.bento.menus_needs_review")
                    }}</span>
                    <strong class="admin-rsvp-metric__value">{{
                      menusSummary.needsReview || 0
                    }}</strong>
                  </div>
                  <template v-if="topMenus.length">
                    <div
                      v-for="m in topMenus"
                      :key="m.key"
                      class="admin-rsvp-metric"
                    >
                      <span class="admin-rsvp-metric__label">{{
                        m.label
                      }}</span>
                      <strong class="admin-rsvp-metric__value">{{
                        m.count
                      }}</strong>
                    </div>
                  </template>
                  <div v-else class="admin-rsvp-metric">
                    <span class="admin-rsvp-metric__label">{{
                      t("admin.bento.none")
                    }}</span>
                    <strong class="admin-rsvp-metric__value">—</strong>
                  </div>
                </div>
                <div class="admin-bento-cta">
                  <Button
                    size="small"
                    class="admin-bento-cta__btn"
                    :label="t('admin.bento.open_section')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    @click.stop="openMenus"
                  />
                </div>
              </template>
            </Card>

            <!-- PLAYLIST -->
            <Card
              v-if="canReadPlaylist"
              class="relative admin-bento-card md:col-span-1 lg:col-span-1"
            >
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-volume-up" aria-hidden="true"></i>
                    {{ t("admin.playlist.title") }}
                  </p>
                </div>
              </template>
              <template #content>
                <p class="admin-rsvp-total">
                  {{ playlistCount }}
                </p>
                <p class="admin-rsvp-total-label">
                  {{ t("admin.bento.playlist_total") }}
                </p>
                <div
                  v-if="playlistPreviewSongs.length"
                  class="admin-playlist-preview"
                >
                  <div
                    v-for="song in playlistPreviewSongs"
                    :key="song.id"
                    class="admin-playlist-preview__item"
                  >
                    <div class="admin-playlist-preview__cover">
                      <img
                        v-if="song.artworkUrl"
                        :src="song.artworkUrl"
                        alt=""
                        class="admin-playlist-preview__cover-img"
                        loading="lazy"
                      />
                      <i v-else class="pi pi-wave-pulse" aria-hidden="true"></i>
                    </div>
                    <div class="admin-playlist-preview__meta">
                      <p class="admin-playlist-preview__title">
                        {{ song.title || "—" }}
                      </p>
                      <p class="admin-playlist-preview__artist">
                        {{ song.artist || "—" }}
                      </p>
                    </div>
                  </div>
                </div>
                <p v-else class="text-xs opacity-70 mt-1">
                  {{ t("admin.playlist.empty_state") }}
                </p>
                <div class="admin-bento-cta">
                  <Button
                    size="small"
                    class="admin-bento-cta__btn"
                    :label="t('admin.bento.open_section')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    @click.stop="openPlaylist"
                  />
                </div>
              </template>
            </Card>
            <!-- AGENDA -->
            <Card
              v-if="canReadAgenda"
              class="relative admin-bento-card md:col-span-1 lg:col-span-1"
            >
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-calendar" aria-hidden="true"></i>
                    {{ t("admin.agenda.title") }}
                  </p>
                </div>
              </template>
              <template #content>
                <p class="admin-rsvp-total">
                  {{ agendaItemCount }}
                </p>
                <p class="admin-rsvp-total-label">
                  {{ t("admin.bento.agenda_total") }}
                </p>
                <div
                  v-if="agendaEdgeItems.length"
                  class="admin-agenda-mini admin-timeline admin-timeline--compact"
                >
                  <div class="admin-agenda-mini__line">
                    <span class="admin-agenda-mini__break">…</span>
                  </div>
                  <div
                    v-for="item in agendaEdgeItems"
                    :key="item.key"
                    class="admin-timeline__item"
                  >
                    <Tag :value="item.time" severity="secondary" />
                    <div class="admin-timeline__body">
                      <p class="admin-timeline__title">{{ item.title }}</p>
                      <p v-if="item.meta" class="admin-timeline__meta">
                        {{ item.meta }}
                      </p>
                    </div>
                  </div>
                </div>
                <p v-else class="text-xs opacity-70">
                  {{ t("admin.bento.none") }}
                </p>
                <div class="admin-bento-cta">
                  <Button
                    size="small"
                    class="admin-bento-cta__btn"
                    :label="t('admin.bento.open_section')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    @click.stop="openAgenda"
                  />
                </div>
              </template>
            </Card>
            <!-- EMAIL BLAST -->
            <Card v-if="canAccessEmail" class="relative admin-bento-card">
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-inbox" aria-hidden="true"></i>
                    {{ t("admin.email_blast.title") }}
                  </p>
                </div>
              </template>
              <template #content>
                <div class="admin-rsvp-metric">
                  <span class="admin-rsvp-metric__label">{{
                    t("admin.bento.email_last")
                  }}</span>
                  <strong class="admin-rsvp-metric__value">
                    {{ formatDateMaybe(emailSummary.lastMassEmailAt) }}
                  </strong>
                </div>
                <p
                  v-if="emailSummary.lastMassEmailSubject"
                  class="mt-2 text-xs font-semibold text-left truncate"
                >
                  {{ emailSummary.lastMassEmailSubject }}
                </p>
                <div
                  v-if="emailSummary.lastMassEmailPreview"
                  class="mt-1 text-left admin-email-preview-card"
                >
                  <div class="admin-email-preview-text">
                    {{ emailSummary.lastMassEmailPreview }}
                  </div>
                </div>
                <div class="admin-bento-cta">
                  <Button
                    size="small"
                    class="admin-bento-cta__btn"
                    :label="t('admin.bento.open_section')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    @click.stop="openEmail"
                  />
                </div>
              </template>
            </Card>
            <!-- BLOG -->
            <Card v-if="canWriteBlog" class="relative admin-bento-card">
              <template #title>
                <div class="flex items-start justify-start">
                  <p class="admin-bento-title">
                    <i class="pi pi-image" aria-hidden="true"></i>
                    <span>{{ t("admin.blog.title") }}</span>
                  </p>
                </div>
              </template>
              <template #content>
                <div class="admin-rsvp-metric">
                  <span class="admin-rsvp-metric__label">{{
                    t("admin.bento.blog_last")
                  }}</span>
                  <strong class="admin-rsvp-metric__value">
                    {{ formatDateMaybe(blogSummary.lastPostAt) }}
                  </strong>
                </div>
                <div v-if="blogSummary.lastImage" class="admin-blog-preview">
                  <img
                    :src="blogSummary.lastImage"
                    alt=""
                    class="admin-blog-preview__img"
                    loading="lazy"
                  />
                </div>
                <div class="admin-bento-cta">
                  <Button
                    size="small"
                    class="admin-bento-cta__btn"
                    :label="t('admin.bento.open_section')"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    @click.stop="openBlog"
                  />
                </div>
              </template>
            </Card>
          </div>
        </div>
        <!-- ============================ -->
        <!--       DETAILED SECTION       -->
        <!-- ============================ -->
        <div v-else class="mt-0">
          <AdminSectionSkeleton v-if="starting" />
          <RsvpSection v-else-if="currentSection === 'rsvp' && canReadRsvp" />
          <BlogSection
            v-else-if="currentSection === 'blog' && canWriteBlog"
            @blog-sent="blogStore.markBlogPostSent()"
          />
          <EmailSection
            v-else-if="currentSection === 'email' && canAccessEmail"
          />
          <SeatingSection
            v-else-if="currentSection === 'seating' && canReadSeating"
          />
          <FinancesSection
            v-else-if="currentSection === 'finances' && canReadFinances"
            :total-present="totalPresent"
          />
          <AgendaSection
            v-else-if="currentSection === 'agenda' && canReadAgenda"
          />
          <PlaylistSection
            v-else-if="currentSection === 'playlist' && canReadPlaylist"
          />
          <div
            v-else-if="currentSection === 'planner' && canReadPlanner"
            class="w-full"
          >
            <WeddingPlannerSection />
          </div>
          <MenusSection
            v-else-if="currentSection === 'menus' && canReadMenus"
          />
        </div>
        <!-- AI CHAT WIDGET -->
        <AdminAiChat
          v-if="canUseAiChat"
          :page-context="currentSection || 'dashboard'"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import {
  ref,
  computed,
  onMounted,
  watch,
  onBeforeUnmount,
  defineAsyncComponent,
} from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import Tag from "primevue/tag";
import AdminSectionSkeleton from "@/components/admin/AdminSectionSkeleton.vue";
import { useLang } from "@/composables/useLang";
import { useMeStore } from "@/stores/meStore";
import { useRsvpStore } from "@/stores/rsvpStore.ts";
import { useEmailStore } from "@/stores/emailStore.ts";
import { useBlogStore } from "@/stores/blogStore.ts";
import { useSeatingStore } from "@/stores/seatingStore.ts";
import { useFinancesStore } from "@/stores/financesStore.ts";
import { useAgendaStore } from "@/stores/agendaStore";
import { usePlaylistStore } from "@/stores/playlistStore";
import { useMenusStore } from "@/stores/menusStore";
import { useAdminDashboardStore } from "@/stores/adminDashboardStore";
import weddingConfig from "../../shared/weddingConfig.ts";
const RsvpSection = defineAsyncComponent(
  () => import("@/components/admin/rsvp/RsvpSection.vue"),
);
const BlogSection = defineAsyncComponent(
  () => import("@/components/admin/BlogSection.vue"),
);
const EmailSection = defineAsyncComponent(
  () => import("@/components/admin/EmailSection.vue"),
);
const SeatingSection = defineAsyncComponent(
  () => import("@/components/admin/seating/SeatingSection.vue"),
);
const FinancesSection = defineAsyncComponent(
  () => import("@/components/admin/FinancesSection.vue"),
);
const AgendaSection = defineAsyncComponent(
  () => import("@/components/admin/agenda/AgendaSection.vue"),
);
const PlaylistSection = defineAsyncComponent(
  () => import("@/components/admin/PlaylistSection.vue"),
);
const WeddingPlannerSection = defineAsyncComponent(
  () => import("@/components/admin/WeddingPlannerSection.vue"),
);
const MenusSection = defineAsyncComponent(
  () => import("@/components/admin/menus/MenusSection.vue"),
);
const AdminAiChat = defineAsyncComponent(
  () => import("@/components/admin/AdminAiChat.vue"),
);
const { t, lang } = useLang();
const me = useMeStore();
const rsvpStore = useRsvpStore();
const emailStore = useEmailStore();
const blogStore = useBlogStore();
const financesStore = useFinancesStore();
const seatingStore = useSeatingStore();
const agendaStore = useAgendaStore();
const playlistStore = usePlaylistStore();
const menusStore = useMenusStore();
const adminDashboardStore = useAdminDashboardStore();
const route = useRoute();
const router = useRouter();
const authed = computed(() => me.authed);
const forbidden = computed(() => me.forbidden);
const booting = computed(() => me.booting);
const canReadRsvp = computed(() => me.canRead("rsvp"));
const canReadFinances = computed(() => me.canRead("finances"));
const canAccessEmail = computed(() => me.canAccessEmail);
const canReadSeating = computed(() => me.canRead("menus_seating"));
const canWriteBlog = computed(() => me.canWrite("blog"));
const canReadAgenda = computed(() => me.canRead("agenda"));
const canReadPlaylist = computed(() => me.canRead("playlist"));
const canReadMenus = computed(() => me.canRead("menus_seating"));
const canReadPlanner = computed(() => me.canRead("planner"));
const canUseAiChat = computed(() => me.canUseAiChat);
const dashboardLoading = computed(
  () => starting.value || adminDashboardStore.loading,
);
const dashboardSummary = computed(() => adminDashboardStore.summary || {});
const rsvpSummary = computed(() => dashboardSummary.value.rsvp || {});
const financesSummary = computed(() => dashboardSummary.value.finances || {});
const menusSummary = computed(() => dashboardSummary.value.menus || {});
const seatingSummary = computed(() => dashboardSummary.value.seating || {});
const emailSummary = computed(() => dashboardSummary.value.email || {});
const blogSummary = computed(() => dashboardSummary.value.blog || {});
const playlistSummary = computed(() => dashboardSummary.value.playlist || {});
const agendaSummary = computed(() => dashboardSummary.value.agenda || {});
const plannerSummary = computed(() => dashboardSummary.value.planner || {});
const playlistCount = computed(() => playlistSummary.value.totalCount || 0);
const playlistRandomSeed = Math.random().toString(36).slice(2);
const currentSection = ref(null);
const started = ref(false);
const starting = ref(false);
const lastPermsKey = ref("");
const lastInitKey = ref("");
function getInitKey() {
  return `${currentSection.value || "dashboard"}::${me.permissions.join("|")}`;
}

function hashSeededSongId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
function getDashboardSummaryModules() {
  const modules = [];
  if (me.canRead("rsvp")) modules.push("rsvp");
  if (me.canRead("finances")) modules.push("finances");
  if (me.canRead("menus_seating")) modules.push("menus", "seating");
  if (me.canAccessEmail) modules.push("emails");
  if (me.canWrite("blog")) modules.push("blog");
  if (me.canRead("playlist")) modules.push("playlist");
  if (me.canRead("agenda")) modules.push("agenda");
  if (me.canRead("planner")) modules.push("planner");
  return modules;
}
function stopAllStores() {
  rsvpStore.stopRealtime?.();
  blogStore.stop?.();
  emailStore.stop?.();
  seatingStore.destroy?.();
  financesStore.stop?.();
  agendaStore.dispose?.();
  menusStore.disposeRealtime?.();
  playlistStore.unsubscribe?.();
  adminDashboardStore.stop?.();
}
async function initAllowedStores() {
  const section = currentSection.value;
  // Summary is only needed for dashboard bento cards.
  if (!section) {
    await adminDashboardStore.subscribeSummary?.({
      modules: getDashboardSummaryModules(),
    });
    if (me.canRead("playlist")) {
      await playlistStore.subscribe?.();
    }
  }
  // Dashboard (bentos) => summary only
  if (!section) {
    return;
  }
  if (section === "rsvp" && me.canRead("rsvp")) {
    await rsvpStore.startRealtime?.();
  }
  if (section === "blog" && me.canWrite("blog")) {
    await blogStore.subscribePosts?.();
  }
  if (section === "email" && me.canAccessEmail) {
    if (me.canReadEmail) {
      await emailStore.subscribeMeta?.();
    }
    // pour suivre un job même si send-only
    emailStore.resumePollingIfNeeded?.();
  }
  if (
    (section === "seating" || section === "menus") &&
    me.canRead("menus_seating")
  ) {
    await seatingStore.initListeners?.();
    await menusStore.initRealtime?.({ guestIds: [] });
  }
  if (section === "playlist" && me.canRead("playlist")) {
    await playlistStore.subscribe?.();
  }
  if (section === "finances" && me.canRead("finances")) {
    await financesStore.subscribe?.();
  }
  if (section === "agenda" && me.canRead("agenda")) {
    await agendaStore.loadAgenda?.();
  }
}
onMounted(async () => {
  await me.bindAuthListener({
    onUnauthed: () =>
      router.replace({ path: "/access", query: { next: "/admin" } }),
  });
});
onBeforeUnmount(() => {
  stopAllStores();
});
watch(
  () => ({
    booting: me.booting,
    authed: me.authed,
    canDashboard: me.canAccessDashboard,
    forbidden: me.forbidden,
    permsKey: me.permissions.join("|"),
  }),
  async (s) => {
    const ready = !s.booting && s.authed && s.canDashboard && !s.forbidden;
    // pas prêt => stop + reset
    if (!ready) {
      if (started.value || starting.value) {
        started.value = false;
        starting.value = false;
        lastPermsKey.value = "";
        stopAllStores();
      }
      return;
    }
    // prêt, mais perms ont changé => restart complet
    const permsChanged =
      lastPermsKey.value && s.permsKey !== lastPermsKey.value;
    if ((started.value && !permsChanged) || starting.value) return;
    starting.value = true;
    try {
      const initKeyAtStart = getInitKey();
      if (permsChanged) stopAllStores();
      await initAllowedStores();
      lastPermsKey.value = s.permsKey;
      lastInitKey.value = initKeyAtStart;
      started.value = true;
      // If section changed while init was running, run one more pass for the latest section.
      const desiredKey = getInitKey();
      if (desiredKey !== initKeyAtStart) {
        stopAllStores();
        await initAllowedStores();
        lastInitKey.value = desiredKey;
      }
    } finally {
      starting.value = false;
    }
  },
  { immediate: true },
);
watch(
  () => currentSection.value,
  async () => {
    const ready =
      !booting.value &&
      authed.value &&
      me.canAccessDashboard &&
      !forbidden.value;
    if (!ready || starting.value) return;
    const key = getInitKey();
    if (key === lastInitKey.value) return;
    starting.value = true;
    try {
      stopAllStores();
      await initAllowedStores();
      lastInitKey.value = key;
      started.value = true;
    } finally {
      starting.value = false;
    }
  },
);
const allowedSections = computed(() => {
  const s = [];
  if (!me.canAccessDashboard) return s;
  if (me.canRead("rsvp")) s.push("rsvp");
  if (me.canWrite("blog")) s.push("blog");
  if (me.canAccessEmail) s.push("email");
  if (me.canRead("menus_seating")) s.push("seating");
  if (me.canRead("finances")) s.push("finances");
  if (me.canRead("agenda")) s.push("agenda");
  if (me.canRead("playlist")) s.push("playlist");
  if (me.canRead("planner")) s.push("planner");
  if (me.canRead("menus_seating")) s.push("menus"); // ou "menus_seating"
  return s;
});
const navItems = computed(() => {
  const items = [
    {
      key: "dashboard",
      label: t("admin.nav.dashboard"),
      icon: "pi pi-home",
    },
  ];
  if (allowedSections.value.includes("rsvp")) {
    items.push({
      key: "rsvp",
      label: t("admin.bento.rsvp_title"),
      icon: "pi pi-users",
    });
  }
  if (allowedSections.value.includes("planner")) {
    items.push({
      key: "planner",
      label: t("admin.planner.title"),
      icon: "pi pi-sparkles",
    });
  }
  if (allowedSections.value.includes("finances")) {
    items.push({
      key: "finances",
      label: t("admin.nav.budget"),
      icon: "pi pi-wallet",
    });
  }
  if (allowedSections.value.includes("menus")) {
    items.push({
      key: "menus",
      label: t("admin.menus.title"),
      icon: "pi pi-list",
    });
  }
  if (allowedSections.value.includes("seating")) {
    items.push({
      key: "seating",
      label: t("admin.seating.title"),
      icon: "pi pi-map",
    });
  }
  if (allowedSections.value.includes("playlist")) {
    items.push({
      key: "playlist",
      label: t("admin.playlist.title"),
      icon: "pi pi-volume-up",
    });
  }
  if (allowedSections.value.includes("agenda")) {
    items.push({
      key: "agenda",
      label: t("admin.agenda.title"),
      icon: "pi pi-calendar",
    });
  }
  if (allowedSections.value.includes("email")) {
    items.push({
      key: "email",
      label: t("admin.email_blast.title"),
      icon: "pi pi-inbox",
    });
  }
  if (allowedSections.value.includes("blog")) {
    items.push({
      key: "blog",
      label: t("admin.blog.title"),
      icon: "pi pi-image",
    });
  }
  return items;
});
const currentNavLabel = computed(() => {
  const key = currentSection.value || "dashboard";
  return (
    navItems.value.find((item) => item.key === key)?.label ||
    t("admin.nav.dashboard")
  );
});
function syncSectionFromRoute() {
  const sec = route.query.section;
  if (booting.value || forbidden.value || !me.canAccessDashboard) {
    currentSection.value = null;
    return;
  }
  if (typeof sec === "string" && allowedSections.value.includes(sec)) {
    currentSection.value = sec;
  } else {
    currentSection.value = null;
  }
}
watch(
  [
    () => route.query.section,
    () => me.permissions.join("|"),
    () => me.forbidden,
    () => me.booting,
  ],
  syncSectionFromRoute,
  { immediate: true },
);
const totalPresent = computed(() => {
  const tt = rsvpSummary.value || {};
  return (tt.attending || 0) + (tt.plusOnes || 0);
});
const totalTables = computed(() => {
  return seatingSummary.value.totalTables || 0;
});
const unassignedCount = computed(() => {
  return seatingSummary.value.unassignedCount || 0;
});
const rsvpAcceptedCount = computed(() => {
  return (
    Number(rsvpSummary.value.attending || 0) +
    Number(rsvpSummary.value.plusOnes || 0)
  );
});
const rsvpDeclinedCount = computed(() =>
  Number(rsvpSummary.value.declinedCount || 0),
);
const rsvpYesNoTotal = computed(
  () => rsvpAcceptedCount.value + rsvpDeclinedCount.value,
);
const rsvpYesRate = computed(() => {
  if (!rsvpYesNoTotal.value) return 0;
  return Math.round((rsvpAcceptedCount.value / rsvpYesNoTotal.value) * 100);
});
const rsvpYesNoDonutStyle = computed(() => {
  if (!rsvpYesNoTotal.value) {
    return { background: "conic-gradient(#d8d8de 0% 100%)" };
  }
  const yesPct = Math.round(
    (rsvpAcceptedCount.value / rsvpYesNoTotal.value) * 100,
  );
  return {
    background: `conic-gradient(#4caf50 0% ${yesPct}%, #e57373 ${yesPct}% 100%)`,
  };
});
const financeUsedPct = computed(() => {
  const used = Number(financesSummary.value.percentUsed || 0);
  if (!Number.isFinite(used)) return 0;
  return Math.max(0, Math.min(100, Math.round(used)));
});
const financeDonutStyle = computed(() => ({
  background: `conic-gradient(var(--menu-active-color) 0% ${financeUsedPct.value}%, var(--accent-color) ${financeUsedPct.value}% 100%)`,
}));
const plannerHighlights = computed(() => {
  const planner = Array.isArray(plannerSummary.value.upcoming)
    ? plannerSummary.value.upcoming
    : [];
  return planner.slice(0, 4).map((it, idx) => ({
    key: `planner-highlight-${idx}`,
    title: it?.title || "—",
    priority: String(it?.priority || "medium"),
    meta:
      [it?.dueDate, it?.dueTime].filter(Boolean).join(" · ") ||
      t("admin.bento.none"),
  }));
});
const playlistPreviewSongs = computed(() => {
  const songs = Array.isArray(playlistStore.visibleSongs)
    ? playlistStore.visibleSongs
    : [];
  if (!songs.length) return [];
  return songs
    .slice()
    .sort(
      (a, b) =>
        hashSeededSongId(`${a.id}-${playlistRandomSeed}`) -
        hashSeededSongId(`${b.id}-${playlistRandomSeed}`),
    )
    .slice(0, 3);
});
function plannerPriorityLabel(priority) {
  if (priority === "urgent") return t("admin.planner.priority.urgent");
  if (priority === "high") return t("admin.planner.priority.high");
  if (priority === "low") return t("admin.planner.priority.low");
  return t("admin.planner.priority.medium");
}
function plannerPrioritySeverity(priority) {
  const p = String(priority || "").toLowerCase();
  if (p === "urgent") return "danger";
  if (p === "high") return "warn";
  if (p === "low") return "secondary";
  return "info";
}
function isMenuItemActive(sec) {
  if (sec === "dashboard") return !currentSection.value;
  return currentSection.value === sec;
}
function goBackToDashboard() {
  router.push({ path: "/admin", query: {} });
}
function openSection(section) {
  if (section === "dashboard") {
    goBackToDashboard();
    return;
  }
  if (!allowedSections.value.includes(section)) return;
  router.push({ path: "/admin", query: { section } });
}
function openRsvp() {
  openSection("rsvp");
}
function openBlog() {
  openSection("blog");
}
function openEmail() {
  openSection("email");
}
function openSeating() {
  openSection("seating");
}
function openFinances() {
  openSection("finances");
}
function openAgenda() {
  openSection("agenda");
}
function openPlaylist() {
  openSection("playlist");
}
function openPlanner() {
  openSection("planner");
}
function openMenus() {
  openSection("menus");
}
const weddingTargetDate = computed(
  () => new Date(weddingConfig.countdown.targetDateTimeUtc),
);
const countdownDays = computed(() => {
  const target = new Date(weddingConfig.countdown.targetDateTimeUtc);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const diffMs = startOfTarget - startOfToday;
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
});
const weddingDateLabel = computed(() => {
  if (weddingConfig?.event?.dateDisplayShort)
    return weddingConfig.event.dateDisplayShort;
  const locale = lang.value === "en" ? "en-GB" : "es-ES";
  return weddingTargetDate.value.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
});
function formatMoney(v) {
  const n = Number(v) || 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}
function toDateMaybe(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts === "object") {
    const secs = ts._seconds ?? ts.seconds ?? null;
    const nanos = ts._nanoseconds ?? ts.nanoseconds ?? 0;
    if (typeof secs === "number") {
      const d = new Date(secs * 1000 + Math.floor(Number(nanos || 0) / 1e6));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof ts === "string" || typeof ts === "number") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
function formatDateMaybe(ts) {
  const d = toDateMaybe(ts);
  return d ? d.toLocaleString() : t("admin.bento.none");
}
const agendaItemCount = computed(() => agendaSummary.value.totalCount || 0);
const agendaEdgeItems = computed(() => {
  const first = agendaSummary.value.first || null;
  const last = agendaSummary.value.last || null;
  const items = [];
  if (first) {
    items.push({
      key: "agenda-first",
      title: first.title || "—",
      time: first.time || "—",
      meta: "",
    });
  }
  if (
    last &&
    (!first || first.title !== last.title || first.time !== last.time)
  ) {
    items.push({
      key: "agenda-last",
      title: last.title || "—",
      time: last.time || "—",
      meta: "",
    });
  }
  return items;
});
onBeforeRouteLeave(() => {
  stopAllStores();
  started.value = false;
  starting.value = false;
  lastPermsKey.value = "";
  lastInitKey.value = "";
});
const topMenus = computed(() => {
  const list = menusSummary.value.top || [];
  return Array.isArray(list)
    ? list.map((m, idx) => ({
        key: `menu-${idx}`,
        label: m?.label || "—",
        count: Number(m?.count || 0),
      }))
    : [];
});
</script>
<style scoped>
.admin-shell {
  --admin-sidebar-bg: #ffffff;
  background: var(--primary-color);
}
.admin-layout {
  display: grid;
  grid-template-columns: minmax(220px, 250px) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}
.admin-sidebar {
  position: sticky;
  top: 1rem;
  border-radius: 1rem;
  background: var(--admin-sidebar-bg);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  padding: 1rem;
}
.admin-sidebar__eyebrow {
  font-size: 0.95rem;
  font-weight: 700;
}
.admin-sidebar__subtitle {
  font-size: 0.8rem;
  opacity: 0.65;
}
.admin-sidebar__links {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.admin-nav-link {
  display: flex;
  width: 100%;
  border: 0;
  border-radius: 0.7rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.92rem;
  text-align: left;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}
.admin-nav-link:hover {
  background: rgba(133, 101, 101, 0.12);
  transform: translateX(1px);
}
.admin-nav-link.is-active {
  color: #fff;
  background: var(--menu-active-color);
  box-shadow: 0 8px 20px rgba(133, 101, 101, 0.28);
}
.admin-content {
  min-width: 0;
}
:deep(
  .admin-content .p-card:not(.admin-bento-card--static):not(.admin-kpi-card)
) {
  background: #ffffff !important;
  color: var(--text-color) !important;
  border: 1px solid rgba(15, 23, 42, 0.06) !important;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

:deep(.admin-content .admin-kpi-card.p-card) {
  background: var(--surface-soft) !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 1rem;
}
:deep(.admin-content .admin-kpi-card .p-card-body) {
  padding: 1rem;
}
:deep(.admin-content .admin-kpi-card .p-card-content) {
  padding: 0;
}

.admin-bento-title {
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(51, 51, 51, 0.7);
}
.admin-bento-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-align: left;
}
.admin-rsvp-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-areas:
    "left right"
    "last last";
  gap: 1rem;
  align-items: start;
}
.admin-rsvp-layout__left {
  grid-area: left;
  min-width: 0;
}
.admin-rsvp-layout__right {
  grid-area: right;
  display: flex;
  justify-content: flex-end;
}
.admin-rsvp-last {
  grid-area: last;
  margin-top: 0.1rem;
  background: var(--surface-soft);
  border-radius: 0.6rem;
  padding: 0.55rem 0.7rem;
  text-align: left;
}
.admin-rsvp-last__label {
  margin: 0;
  font-size: 0.72rem;
  color: rgba(51, 51, 51, 0.66);
  text-align: left;
}
.admin-rsvp-last__value {
  margin: 0.18rem 0 0;
  font-size: 0.86rem;
  line-height: 1.32;
  text-align: left;
}
.admin-rsvp-total {
  font-size: 3.2rem;
  line-height: 1;
  font-weight: 400;
  margin-bottom: 0.2rem;
  text-align: left;
  align-self: flex-start;
}
.admin-rsvp-total-label {
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.68);
  margin-bottom: 0.7rem;
  text-align: left;
  align-self: flex-start;
}
.admin-rsvp-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  align-items: start;
}
.admin-rsvp-metrics .admin-rsvp-metric {
  width: 100%;
  padding: 0.45rem 0.55rem;
  border-radius: 0.6rem;
  background: var(--surface-soft);
}
.admin-rsvp-metrics .admin-rsvp-metric:last-child {
  grid-column: 1 / -1;
}
.admin-rsvp-metric {
  padding: 0.45rem 0.55rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
}
.admin-rsvp-metric__label {
  font-size: 0.72rem;
  color: rgba(51, 51, 51, 0.66);
  text-align: left;
}
.admin-rsvp-metric__value {
  font-size: 1.25rem;
  font-weight: 400;
  line-height: 1.1;
  text-align: left;
}
.admin-rsvp-donut-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
}
.admin-rsvp-donut {
  width: 170px;
  height: 170px;
  border-radius: 50%;
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.admin-rsvp-donut::after {
  content: "";
  position: absolute;
  inset: 32px;
  border-radius: 50%;
  background: #fff;
}
.admin-rsvp-donut > span {
  position: relative;
  z-index: 1;
  font-size: 1.2rem;
  font-weight: 400;
}
.admin-rsvp-donut-legend p {
  margin: 0;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  justify-content: center;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}
.dot-ok {
  background: #4caf50;
}
.dot-no {
  background: #e57373;
}
.admin-finance-layout {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: start;
}
.admin-finance-layout__left {
  min-width: 0;
}
.admin-finance-recent {
  margin-top: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.admin-finance-recent__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.45rem 0.55rem;
  border-radius: 0.6rem;
  background: var(--surface-soft);
  color: rgba(51, 51, 51, 0.72);
}
.admin-finance-recent__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
}
.admin-finance-recent__amount {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}
.admin-finance-layout__right {
  display: flex;
  justify-content: flex-end;
}
.admin-finance-donut-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}
.admin-finance-donut {
  width: 86px;
  height: 86px;
  border-radius: 50%;
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.admin-finance-donut::after {
  content: "";
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  background: #fff;
}
.admin-finance-donut > span {
  position: relative;
  z-index: 1;
  font-size: 0.9rem;
  font-weight: 600;
}
.admin-finance-donut-legend {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.admin-finance-donut-legend p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
}
.dot-finance-used {
  background: var(--menu-active-color);
}
.dot-finance-remaining {
  background: var(--accent-color);
}
.admin-playlist-preview {
  margin-top: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.admin-playlist-preview__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.admin-playlist-preview__cover {
  width: 30px;
  height: 30px;
  border-radius: 0.45rem;
  background: #f2f3f8;
  color: rgba(51, 51, 51, 0.5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.admin-playlist-preview__cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.admin-playlist-preview__meta {
  min-width: 0;
}
.admin-playlist-preview__title {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.admin-playlist-preview__artist {
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.2;
  color: rgba(51, 51, 51, 0.65);
  text-align: left;
}
.admin-blog-preview {
  margin-bottom: 0.55rem;
}
.admin-blog-preview__img {
  width: 100%;
  max-height: 120px;
  border-radius: 0.6rem;
  object-fit: cover;
  display: block;
}
.admin-email-preview-card {
  padding: 0.45rem 0.55rem;
  border-radius: 0.6rem;
  background: var(--surface-soft);
}
.admin-email-preview-text {
  margin: 0;
  font-size: 0.75rem; /* text-xs */
  color: rgba(51, 51, 51, 0.7);
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: anywhere;

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  /* extra pixel to prevent last-line clipping on some browsers */
  padding-bottom: 1px;
}
.admin-menus-metrics {
  margin-top: 0.45rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem 0.9rem;
  color: rgba(51, 51, 51, 0.72);
}
.admin-menus-metrics .admin-rsvp-metric {
  padding: 0.45rem 0.55rem;
  border-radius: 0.6rem;
  background: var(--surface-soft);
}
.admin-menus-metrics .admin-rsvp-metric__value {
  color: rgba(51, 51, 51, 0.72);
}
.admin-agenda-mini {
  margin-top: 0.55rem;
  position: relative;
  padding-left: 0.8rem;
}
.admin-agenda-mini__line {
  position: absolute;
  left: 0.36rem;
  top: 0.45rem;
  bottom: 0.45rem;
  width: 1px;
  background: transparent;
}
.admin-agenda-mini__line::before,
.admin-agenda-mini__line::after {
  content: "";
  position: absolute;
  left: 0;
  width: 1px;
  background: rgba(133, 101, 101, 0.38);
  border-radius: 999px;
}
.admin-agenda-mini__line::before {
  top: 0;
  height: calc(50% - 12px);
}
.admin-agenda-mini__line::after {
  bottom: 0;
  height: calc(50% - 12px);
}
.admin-agenda-mini__break {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.9rem;
  line-height: 1;
  color: rgba(133, 101, 101, 0.85);
  background: #fff;
  padding: 0.1rem 0.28rem;
  border-radius: 999px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(133, 101, 101, 0.18);
  user-select: none;
}
.admin-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.admin-timeline--compact .admin-timeline__item {
  padding: 0.35rem 0.45rem;
  justify-content: space-between;
}
.admin-timeline--compact .admin-timeline__badge {
  font-size: 0.64rem;
}
.admin-timeline--compact .admin-timeline__title {
  font-size: 0.8rem;
}
.admin-timeline--compact .admin-timeline__meta {
  font-size: 0.72rem;
}
.admin-timeline--compact .admin-timeline__body {
  order: 1;
  flex: 1;
  min-width: 0;
}
.admin-timeline--compact :deep(.p-tag) {
  order: 2;
  margin-left: auto;
  flex-shrink: 0;
  font-size: 0.62rem;
  line-height: 1;
  padding: 0.16rem 0.38rem;
}
.admin-timeline__item {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.45rem 0.55rem;
  border-radius: 0.6rem;
  background: var(--surface-soft);
}
.admin-timeline__badge {
  font-size: 0.7rem;
  line-height: 1;
  background: var(--menu-active-color);
  color: #fff;
  padding: 0.25rem 0.45rem;
  border-radius: 999px;
}
.admin-timeline__title {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 600;
  text-align: left;
}
.admin-timeline__meta {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(51, 51, 51, 0.72);
  text-align: left;
}
.admin-timeline__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.admin-bento-card {
  background: #ffffff !important;
  color: var(--text-color) !important;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  height: 100%;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.admin-bento-card--stacked {
  height: auto !important;
}
.admin-bento-card--static {
  background: var(--primary-color) !important;
  border-color: rgba(133, 101, 101, 0.22);
  box-shadow:
    inset 0 0 0 1px rgba(133, 101, 101, 0.08),
    0 6px 18px rgba(15, 23, 42, 0.04);
  height: auto !important;
}
:deep(.admin-bento-card .p-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
:deep(.admin-bento-card .p-card-content) {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.admin-bento-cta {
  margin-top: auto;
  padding-top: 0.85rem;
}
.admin-bento-cta__btn {
  width: 100%;
}
:deep(.admin-bento-cta__btn.p-button) {
  background: var(--accent-color) !important;
  border-color: var(--accent-color) !important;
  color: var(--p-primary-contrast-color, #fff) !important;
}
:deep(.admin-bento-cta__btn.p-button:hover) {
  background: var(--primary-color) !important;
  border-color: var(--accent-hover-color) !important;
  color: var(--accent-hover-color) !important;
}
:deep(.admin-bento-cta__btn.p-button:hover .p-button-label),
:deep(.admin-bento-cta__btn.p-button:hover .p-button-icon) {
  color: var(--accent-hover-color) !important;
}
@media (max-width: 1024px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }
  .admin-sidebar {
    position: static;
  }
  .admin-sidebar__links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* RSVP bento: stack first two metric tiles between 768px and 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  .admin-rsvp-metrics {
    grid-template-columns: 1fr;
  }
  .admin-rsvp-metrics .admin-rsvp-metric:last-child {
    grid-column: auto;
  }
}
@media (max-width: 640px) {
  .admin-rsvp-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "left"
      "right"
      "last";
  }
  .admin-rsvp-layout__right {
    justify-content: flex-start;
  }
  .admin-sidebar__links {
    grid-template-columns: 1fr;
  }
}
</style>
