<!-- src/components/admin/FinancesSection.vue -->
<template>
  <div v-if="showSkeleton" class="space-y-6">
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <Skeleton width="10rem" height="1rem" />
      </template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton width="100%" height="6.25rem" />
          <Skeleton width="100%" height="6.25rem" />
          <Skeleton width="100%" height="6.25rem" />
          <Skeleton width="100%" height="6.25rem" />
          <Skeleton width="100%" height="6.25rem" />
          <Skeleton width="100%" height="6.25rem" />
        </div>
        <Skeleton width="100%" height="3.25rem" class="mt-4" />
      </template>
    </Card>

    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <Skeleton width="9rem" height="1rem" />
      </template>
      <template #content>
        <div class="finances-charts-grid grid gap-6 items-start">
          <div class="flex flex-col items-center gap-2">
            <Skeleton width="10rem" height="0.9rem" />
            <Skeleton width="16rem" height="16rem" border-radius="999px" />
          </div>
          <div class="flex flex-col items-center gap-2">
            <Skeleton width="10rem" height="0.9rem" />
            <Skeleton width="16rem" height="16rem" border-radius="999px" />
          </div>
          <div class="flex flex-col items-center gap-2">
            <Skeleton width="10rem" height="0.9rem" />
            <Skeleton width="100%" height="18rem" />
          </div>
        </div>
      </template>
    </Card>

    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <Skeleton width="11rem" height="1rem" />
      </template>
      <template #content>
        <div class="space-y-2">
          <Skeleton width="100%" height="2.75rem" />
          <Skeleton width="100%" height="2.75rem" />
          <Skeleton width="100%" height="2.75rem" />
          <Skeleton width="100%" height="2.75rem" />
        </div>
      </template>
    </Card>
  </div>

  <div v-else class="space-y-6">
    <!-- OVERVIEW -->
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2 min-w-0">
            <p class="admin-bento-title truncate">
              <i class="pi pi-wallet text-sm" aria-hidden="true" />
              {{ t("admin.finances.title") }}
            </p>
            <Button
              v-if="!showHelper"
              text
              rounded
              size="small"
              icon="pi pi-info-circle"
              severity="secondary"
              class="p-0"
              aria-label="Help"
              @click="openHelp"
            />
          </div>
        </div>
      </template>

      <template #content>
        <!-- INFO -->
        <Message
          v-if="showHelper"
          severity="info"
          closable
          class="mb-3"
          @close="closeHelp"
        >
          <div class="space-y-1 text-xs text-left">
            <p>
              {{ t("admin.finances.helper_body") }}
            </p>
          </div>
        </Message>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Budget total -->
          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.finances.total_budget") }}
              </p>

              <div class="flex items-center gap-2">
                <InputNumber
                  :disabled="!canWriteFinances || savingBudget"
                  v-model="localTotalBudget"
                  :min="0"
                  mode="currency"
                  currency="EUR"
                  locale="fr-FR"
                  class="w-full"
                  @blur="onBudgetBlur"
                />
              </div>
            </template>
          </Card>

          <!-- Dépensé -->
          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.finances.spent") }}
              </p>
              <p class="text-3xl">
                {{ money(finances.spentTotal) }}
              </p>
              <p class="text-xs opacity-70 mt-2 flex justify-between">
                <span>{{ t("admin.finances.paid") }}</span>
                <span class="font-semibold">{{ money(paidTotalAll) }}</span>
              </p>
              <p class="text-xs opacity-70 flex justify-between">
                <span>{{ t("admin.finances.to_pay") }}</span>
                <span class="font-semibold">{{ money(unpaidTotalAll) }}</span>
              </p>
            </template>
          </Card>

          <!-- Net dépensé -->
          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.finances.net_spent", "Net dépensé") }}
              </p>
              <p class="text-3xl">
                {{ money(finances.netSpentTotal) }}
              </p>
              <p class="text-xs opacity-60 mt-1">
                {{ t("admin.finances.net_hint", "Dépensé - cadeaux") }}
              </p>
            </template>
          </Card>

          <!-- Restant -->
          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.finances.remaining") }}
              </p>
              <p class="text-3xl">
                {{ money(finances.remaining) }}
              </p>
            </template>
          </Card>

          <!-- Coût / invité -->
          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.finances.cost_per_guest") }}
              </p>
              <p class="text-3xl">
                {{ money(costPerGuest) }}
              </p>
              <p class="text-xs opacity-60 mt-1">
                {{
                  t("admin.finances.present_count").replace(
                    "{n}",
                    String(totalPresentSafe),
                  )
                }}
              </p>
            </template>
          </Card>

          <!-- Cadeaux -->
          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.finances.gifts_total", "Cadeaux") }}
              </p>
              <p class="text-3xl">
                {{ money(finances.giftsTotal) }}
              </p>
            </template>
          </Card>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm opacity-70">
              {{ t("admin.finances.percent_used") }}
            </p>
            <p class="text-sm font-semibold">{{ finances.percentUsed }}%</p>
          </div>

          <div class="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="barClass"
              :style="{ width: `${finances.percentUsed}%` }"
            />
          </div>

          <p v-if="isOverThreshold" class="text-xs text-red-600 mt-2">
            {{ t("admin.finances.alert_over") }}
          </p>
        </div>
      </template>
    </Card>

    <!-- GRAPHIQUES -->
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <p class="admin-bento-title truncate">
              <i class="pi pi-chart-pie text-sm" aria-hidden="true" />
              {{ t("admin.finances.charts") }}
            </p>
            <Button
              v-if="!showChartsHelp"
              text
              rounded
              size="small"
              icon="pi pi-info-circle"
              severity="secondary"
              class="p-0"
              aria-label="Help"
              @click="openChartsHelp"
            />
          </div>

          <!-- filtre + reset (card impactée) -->
          <div
            v-if="selectedCategory"
            class="text-xs opacity-70 flex items-center gap-2"
          >
            <span>
              {{ t("admin.finances.filter") }} :
              <span class="font-semibold">{{
                categoryLabel(selectedCategory)
              }}</span>
            </span>
            <Button
              text
              size="small"
              icon="pi pi-times"
              :label="t('common.reset')"
              @click="clearCategoryFilter"
            />
          </div>
        </div>
      </template>

      <template #content>
        <Message
          v-if="showChartsHelp"
          severity="info"
          closable
          class="mb-3"
          @close="closeChartsHelp"
        >
          <div class="space-y-1 text-xs text-left">
            <p>
              {{ t("admin.finances.charts_help") }}
            </p>
          </div>
        </Message>

        <div class="finances-charts-grid grid gap-6 items-start">
          <!-- Donut catégories -->
          <div class="flex flex-col items-center">
            <p class="text-xs opacity-70 mb-2 uppercase">
              {{ t("admin.finances.pie_title") }}
            </p>

            <div class="chartBox">
              <Chart
                v-if="pieHasData"
                type="doughnut"
                :data="pieData"
                :options="pieOptions"
              />
              <ContentViewer
                v-else
                class="text-sm opacity-70 text-center"
                :empty-text="t('admin.finances.no_data')"
              />
            </div>
          </div>

          <!-- Donut payé vs à payer -->
          <div class="flex flex-col items-center">
            <p class="text-xs opacity-70 mb-2 uppercase">
              {{ t("admin.finances.paid_split") }}
            </p>

            <div class="chartBox">
              <div v-if="paidHasData">
                <Chart
                  type="doughnut"
                  :data="paidData"
                  :options="paidOptions"
                />
              </div>
              <ContentViewer
                v-else
                class="text-sm opacity-70 text-center"
                :empty-text="t('admin.finances.no_paid_split')"
              />
            </div>
          </div>

          <!-- Donut dépenses par personne -->
          <div class="flex flex-col items-center">
            <p class="text-xs opacity-70 mb-2 uppercase">
              {{ t("admin.finances.by_payer", "Dépenses par personne") }}
            </p>

            <div class="chartBox">
              <Chart
                v-if="payerPieHasData"
                type="doughnut"
                :data="payerPieData"
                :options="payerPieOptions"
              />
              <ContentViewer
                v-else
                class="text-sm opacity-70 text-center"
                :empty-text="
                  t('admin.finances.no_data', 'Aucune donnée à afficher.')
                "
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- LISTE DÉPENSES -->
    <Card
      ref="expensesTableRef"
      :style="{ border: '1px solid var(--accent-color)' }"
    >
      <template #title>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2 min-w-0">
            <p class="admin-bento-title truncate">
              <i class="pi pi-credit-card text-sm" aria-hidden="true" />
              {{ t("admin.finances.expenses") }}
            </p>
            <Button
              v-if="!showExpensesHelp"
              text
              rounded
              size="small"
              icon="pi pi-info-circle"
              severity="secondary"
              class="p-0"
              aria-label="Help"
              @click="openExpensesHelp"
            />
          </div>

          <div class="flex items-center gap-3 flex-wrap">
            <!-- filtre category (déjà) -->
            <div
              v-if="selectedCategory"
              class="text-xs opacity-70 flex items-center gap-2"
            >
              <span>
                {{ t("admin.finances.filter") }} :
                <span class="font-semibold">{{
                  categoryLabel(selectedCategory)
                }}</span>
              </span>
              <Button
                text
                size="small"
                icon="pi pi-times"
                :label="t('common.reset')"
                @click="clearCategoryFilter"
              />
            </div>
          </div>
        </div>
      </template>

      <template #content>
        <Message
          v-if="showExpensesHelp"
          severity="info"
          closable
          class="mb-3"
          @close="closeExpensesHelp"
        >
          <div class="space-y-1 text-xs text-left">
            <p>
              {{ t("admin.finances.expenses_help") }}
            </p>
          </div>
        </Message>

        <div class="overflow-auto mt-6">
          <DataTable
            ref="dtRef"
            :value="sortedExpenses"
            v-model:filters="dtFilters"
            filter-display="row"
            :global-filter-fields="['label', 'note', 'category', 'payer']"
            data-key="id"
            :paginator="hasVisibleExpensesData"
            :rows="expensesTableRows"
            :rows-per-page-options="expensesRowsPerPageOptions"
            sort-mode="single"
            sort-field="date"
            :sort-order="-1"
            responsive-layout="scroll"
            size="small"
            class="admin-datatable"
            :show-headers="hasVisibleExpensesData || hasActiveFilters"
            @filter="onDataTableFilter"
            @page="onExpensesTablePage"
          >
            <template #header>
              <div class="flex justify-between gap-3 flex-col md:flex-row">
                <!-- add expense-->
                <Button
                  v-if="canWriteFinances"
                  icon="pi pi-plus"
                  size="small"
                  class="btn-accent"
                  :label="t('admin.finances.add')"
                  @click="openCreateExpense()"
                />

                <IconField icon-position="left" class="w-full md:w-72">
                  <InputIcon class="pi pi-search" />
                  <InputText
                    v-model="search"
                    :placeholder="t('admin.finances.search')"
                    class="text-sm"
                  />
                </IconField>
              </div>
            </template>

            <!-- DATE -->
            <Column
              field="date"
              :header="t('admin.finances.exp_date')"
              style="width: 10rem"
              sortable
            >
              <template #body="{ data }">
                <span class="text-sm">{{ formatDate(data.date) }}</span>
              </template>
            </Column>

            <!-- LABEL -->
            <Column
              field="label"
              :header="t('admin.finances.exp_label')"
              sortable
            >
              <template #body="{ data }">
                <p class="font-semibold text-sm truncate">
                  {{ data.label || "—" }}
                </p>
                <p v-if="data.note" class="text-xs opacity-70 truncate">
                  {{ data.note }}
                </p>
              </template>
            </Column>

            <!-- CATEGORY -->
            <Column
              field="category"
              :header="t('admin.finances.exp_category')"
              style="width: 14rem"
              sortable
              :show-filter-menu="false"
            >
              <template #filter="{ filterModel, filterCallback }">
                <Select
                  v-model="filterModel.value"
                  class="w-full finances-filter-select"
                  :options="categoryFilterOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  @update:model-value="filterCallback()"
                >
                  <template #value="{ value, placeholder }">
                    <Tag
                      v-if="value"
                      severity="info"
                      class="!rounded-full text-xs border"
                      :value="categoryLabelValue(value)"
                    />
                    <span v-else class="text-xs opacity-60">{{
                      placeholder
                    }}</span>
                  </template>
                  <template #option="{ option }">
                    <Tag
                      severity="info"
                      class="!rounded-full text-xs border"
                      :value="option.label"
                    />
                  </template>
                </Select>
              </template>

              <template #body="{ data }">
                <Tag
                  v-if="(data.category || '').trim()"
                  severity="info"
                  class="!rounded-full text-xs border"
                >
                  <template #default>
                    <span class="text-xs">{{
                      categoryLabelValue(data.category)
                    }}</span>
                  </template>
                </Tag>

                <span v-else class="opacity-60">—</span>
              </template>
            </Column>

            <!-- AMOUNT -->
            <Column
              field="amount"
              :header="t('admin.finances.exp_amount')"
              style="width: 10rem"
              sortable
            >
              <template #body="{ data }">
                <span class="whitespace-nowrap">
                  {{ money(data.amount) }}
                </span>
              </template>
            </Column>

            <!-- PAYER -->
            <Column
              field="payer"
              :header="t('admin.finances.exp_payer', 'Payé par')"
              style="width: 12rem"
              sortable
              :show-filter-menu="false"
            >
              <template #filter="{ filterModel, filterCallback }">
                <Select
                  v-model="filterModel.value"
                  class="w-full finances-filter-select"
                  :options="payerFilterOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  @update:model-value="filterCallback()"
                />
              </template>

              <template #body="{ data }">
                <span class="text-sm">{{
                  (data.payer || "").trim() || "—"
                }}</span>
              </template>
            </Column>

            <!-- PAID -->
            <Column
              field="paid"
              :header="t('admin.finances.exp_paid')"
              style="width: 7rem"
              sortable
              :show-filter-menu="false"
            >
              <template #filter="{ filterModel, filterCallback }">
                <Select
                  v-model="filterModel.value"
                  class="w-full finances-filter-select"
                  :options="paidFilterOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  @update:model-value="filterCallback()"
                >
                  <template #value="{ value, placeholder }">
                    <Tag
                      v-if="value !== null && value !== undefined"
                      class="!rounded-full text-xs"
                      :severity="value ? 'success' : 'danger'"
                      :value="
                        value
                          ? t('admin.finances.paid', 'Payé')
                          : t('admin.finances.to_pay', 'À payer')
                      "
                    />
                    <span v-else class="text-xs opacity-60">{{
                      placeholder
                    }}</span>
                  </template>
                  <template #option="{ option }">
                    <Tag
                      class="!rounded-full text-xs"
                      :severity="option.value ? 'success' : 'danger'"
                      :value="option.label"
                    />
                  </template>
                </Select>
              </template>

              <template #body="{ data }">
                <Tag
                  class="!rounded-full text-xs"
                  :severity="data.paid ? 'success' : 'danger'"
                  :value="
                    data.paid
                      ? t('admin.finances.paid', 'Payé')
                      : t('admin.finances.to_pay', 'À payer')
                  "
                />
              </template>
            </Column>

            <!-- ACTIONS -->
            <Column
              v-if="canWriteFinances"
              :header="t('common.actions')"
              style="width: 7rem"
            >
              <template #body="{ data }">
                <div class="flex justify-end gap-2">
                  <Button
                    icon="pi pi-pencil"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    v-tooltip.top="t('common.edit')"
                    :aria-label="t('common.edit')"
                    @click.stop="openEditExpense(data)"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    rounded
                    size="small"
                    v-tooltip.top="t('common.delete')"
                    :aria-label="t('common.delete')"
                    @click.stop="confirmDeleteExpense(data)"
                  />
                </div>
              </template>
            </Column>

            <template #empty>
              <ContentViewer
                class="my-3"
                :show-no-results="hasActiveFilters"
                :no-results-text="
                  t('common.no_results', 'Aucun résultat pour votre recherche.')
                "
                :empty-text="
                  t('admin.finances.no_data', 'Aucune donnée à afficher.')
                "
              />
            </template>
          </DataTable>
        </div>
      </template>
    </Card>

    <!-- ADD EXPENSES DIALOG -->
    <Dialog
      v-if="canWriteFinances"
      v-model:visible="showExpenseDialog"
      modal
      :header="expenseDialogHeader"
      :style="{ width: '720px', maxWidth: '96vw' }"
      :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
      @hide="closeExpenseDialog"
    >
      <div v-if="expenseDraft" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="font-semibold text-sm">{{
              t("admin.finances.exp_date")
            }}</label>
            <DatePicker
              v-model="expenseDraftDate"
              date-format="dd/mm/yy"
              show-icon
              class="w-full"
              input-class="w-full"
            />
          </div>

          <div>
            <label class="font-semibold text-sm">{{
              t("admin.finances.exp_amount")
            }}</label>
            <InputNumber
              v-model="expenseDraft.amount"
              :min="0"
              mode="currency"
              currency="EUR"
              locale="fr-FR"
              class="w-full"
            />
          </div>
        </div>

        <div>
          <label class="font-semibold text-sm">{{
            t("admin.finances.exp_label")
          }}</label>
          <InputText v-model="expenseDraft.label" class="w-full" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="font-semibold text-sm">{{
              t("admin.finances.exp_category")
            }}</label>

            <AutoComplete
              v-model="categoryUi"
              :suggestions="categorySuggestions"
              option-label="label"
              dropdown
              :force-selection="false"
              :complete-on-focus="true"
              class="w-full"
              :placeholder="t('admin.finances.category_ph', 'Catégorie')"
              @complete="searchExpenseCategories"
              :pt="{ input: { onKeydown: onExpenseCategoryKeydown } }"
            >
              <template #option="{ option }">
                <Tag
                  severity="info"
                  class="!rounded-full text-xs border"
                  :value="option.label"
                />
              </template>
            </AutoComplete>

            <p class="text-[11px] opacity-60 mt-1">
              {{
                t(
                  "admin.finances.hint_category_free",
                  "Tape puis Enter pour créer une catégorie.",
                )
              }}
            </p>
          </div>

          <div>
            <label class="font-semibold text-sm">{{
              t("admin.finances.exp_payer", "Payé par")
            }}</label>

            <AutoComplete
              v-model="expenseDraft.payer"
              :suggestions="payerSuggestions"
              dropdown
              :force-selection="false"
              :complete-on-focus="true"
              class="w-full"
              :placeholder="t('admin.finances.payer_ph', 'Qui a payé ?')"
              @complete="searchExpensePayers"
              :pt="{ input: { onKeydown: onExpensePayerKeydown } }"
            >
              <template #option="{ option }">
                <Tag
                  severity="secondary"
                  class="!rounded-full text-xs border"
                  :value="option"
                />
              </template>
            </AutoComplete>

            <p class="text-[11px] opacity-60 mt-1">
              {{
                t(
                  "admin.finances.hint_payer_free",
                  "Tape un nom puis Enter pour l’ajouter.",
                )
              }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Checkbox v-model="expenseDraft.paid" binary />
          <span class="text-sm">{{ t("admin.finances.exp_paid") }}</span>
        </div>

        <div>
          <label class="font-semibold text-sm">{{
            t("admin.finances.exp_note")
          }}</label>
          <Textarea
            v-model="expenseDraft.note"
            class="w-full"
            rows="3"
            auto-resize
          />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button
            size="small"
            :label="t('common.cancel')"
            icon="pi pi-times"
            severity="secondary"
            @click="closeExpenseDialog()"
          />
          <Button
            size="small"
            :label="t('common.save')"
            icon="pi pi-save"
            :style="{
              backgroundColor: 'var(--accent-color)',
              borderColor: 'var(--accent-color)',
              color: 'white',
            }"
            :disabled="savingExpense || !canSaveExpense"
            @click="saveExpenseDraft()"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";

import Card from "primevue/card";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Checkbox from "primevue/checkbox";
import Select from "primevue/select";
import Chart from "primevue/chart";
import DatePicker from "primevue/datepicker";
import Message from "primevue/message";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import AutoComplete from "primevue/autocomplete";

import {
  financeCategoryOptions,
  categoryLabelFromMeta,
  FINANCE_CATEGORY_META,
} from "../../../shared/financesCategories";

import { useLang } from "@/composables/useLang";
import { useFinancesStore } from "@/stores/financesStore.ts";
import { useMeStore } from "@/stores/meStore";
import { showApiError } from "@/utils/showApiError";
import ContentViewer from "@/components/utils/ContentViewer.vue";

const props = defineProps({
  totalPresent: { type: Number, default: 0 },
});

const { t } = useLang();
const finances = useFinancesStore();
const me = useMeStore();
const confirm = useConfirm();
const toast = useToast();
const canWriteFinances = computed(() => me.canWrite("finances"));
const showSkeleton = computed(
  () =>
    finances.loading &&
    !(finances.expenses || []).length &&
    !(finances.categories || []).length,
);

const FINANCES_HELP_OVERVIEW_KEY = "help:finances:overview";
const FINANCES_HELP_CHARTS_KEY = "help:finances:charts";
const FINANCES_HELP_EXPENSES_KEY = "help:finances:expenses";
const FINANCES_EXPENSES_TABLE_ROWS_STORAGE_KEY =
  "datatable:finances:expenses:rows";
const expensesRowsPerPageOptions = [10, 20, 50, 100];

function getInitialHelpVisibility(key) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(key) !== "hidden";
  } catch {
    return true;
  }
}

function getInitialPageSize(storageKey, defaultSize, allowedSizes) {
  if (typeof window === "undefined") return defaultSize;
  try {
    const rawValue = Number(window.localStorage.getItem(storageKey));
    return allowedSizes.includes(rawValue) ? rawValue : defaultSize;
  } catch {
    return defaultSize;
  }
}

function persistPageSize(storageKey, nextSize, allowedSizes) {
  if (typeof window === "undefined") return;
  if (!allowedSizes.includes(nextSize)) return;
  try {
    window.localStorage.setItem(storageKey, String(nextSize));
  } catch {
    // ignore localStorage failures
  }
}

const showHelper = ref(getInitialHelpVisibility(FINANCES_HELP_OVERVIEW_KEY));
const showChartsHelp = ref(getInitialHelpVisibility(FINANCES_HELP_CHARTS_KEY));
const showExpensesHelp = ref(
  getInitialHelpVisibility(FINANCES_HELP_EXPENSES_KEY),
);
const expensesTableRows = ref(
  getInitialPageSize(
    FINANCES_EXPENSES_TABLE_ROWS_STORAGE_KEY,
    10,
    expensesRowsPerPageOptions,
  ),
);
const localTotalBudget = ref(0);
const savingBudget = ref(false);

const dtRef = ref(null);
const expensesTableRef = ref(null);

const showExpenseDialog = ref(false);
const expenseMode = ref("create"); // create | edit
const expenseDraft = ref(null);
const expenseDraftDate = ref(null);
const savingExpense = ref(false);

function onExpensesTablePage(event) {
  const nextSize = Number(event?.rows);
  if (!expensesRowsPerPageOptions.includes(nextSize)) return;
  expensesTableRows.value = nextSize;
  persistPageSize(
    FINANCES_EXPENSES_TABLE_ROWS_STORAGE_KEY,
    nextSize,
    expensesRowsPerPageOptions,
  );
}

function closeHelp() {
  showHelper.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FINANCES_HELP_OVERVIEW_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openHelp() {
  showHelper.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FINANCES_HELP_OVERVIEW_KEY);
  } catch {
    // ignore localStorage failures
  }
}

function closeChartsHelp() {
  showChartsHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FINANCES_HELP_CHARTS_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openChartsHelp() {
  showChartsHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FINANCES_HELP_CHARTS_KEY);
  } catch {
    // ignore localStorage failures
  }
}

function closeExpensesHelp() {
  showExpensesHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FINANCES_HELP_EXPENSES_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openExpensesHelp() {
  showExpensesHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FINANCES_HELP_EXPENSES_KEY);
  } catch {
    // ignore localStorage failures
  }
}

/* -------------------------------------------
 * Utils
 * ------------------------------------------- */
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(toNumber(v));
}

/* date helpers (store as timestamp at 00:00) */
function startOfTodayTs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toTimestampOrToday(d) {
  if (!d) return startOfTodayTs();
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return startOfTodayTs();
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

function toDate(ts) {
  const n = toNumber(ts);
  if (!n) return null;
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(d);
}

/* -------------------------------------------
 * Init
 * ------------------------------------------- */
onMounted(async () => {
  await finances.subscribe();
});

watch(
  () => finances.budgetTotal,
  (v) => {
    localTotalBudget.value = toNumber(v);
  },
  { immediate: true },
);

async function saveTotalBudget() {
  if (!canWriteFinances.value) return;
  const nextBudget = Math.max(0, toNumber(localTotalBudget.value));
  const currentBudget = Math.max(0, toNumber(finances.budgetTotal));
  if (nextBudget === currentBudget) return;
  if (savingBudget.value) return;

  try {
    savingBudget.value = true;
    await finances.setBudgetTotal(nextBudget);
    localTotalBudget.value = nextBudget;
    toast.add({
      severity: "success",
      summary: t("admin.toast.saved_title"),
      detail: t("admin.finances.toast_budget_saved", "Budget mis à jour."),
      life: 2500,
    });
  } catch (err) {
    showApiError(t, toast, err);
  } finally {
    savingBudget.value = false;
  }
}

async function onBudgetBlur() {
  // PrimeVue InputNumber may flush v-model at blur time.
  await nextTick();
  await saveTotalBudget();
}

/* -------------------------------------------
 * Overview
 * ------------------------------------------- */
const totalPresentSafe = computed(() =>
  Math.max(
    0,
    Number(
      finances.presentTotal !== null
        ? finances.presentTotal
        : props.totalPresent,
    ) || 0,
  ),
);

const costPerGuest = computed(() => {
  const n = totalPresentSafe.value;
  if (!n) return 0;
  return toNumber(finances.spentTotal) / n;
});

const barClass = computed(() => {
  const p = toNumber(finances.percentUsed);
  if (p >= 90) return "bg-red-500";
  if (p >= 70) return "bg-orange-400";
  return "bg-green-500";
});

const isOverThreshold = computed(() => toNumber(finances.percentUsed) >= 90);

/* totals (paid/unpaid) */
const paidTotalAll = computed(() =>
  (finances.expenses || []).reduce(
    (s, e) => s + (e?.paid ? toNumber(e.amount) : 0),
    0,
  ),
);

const unpaidTotalAll = computed(() =>
  (finances.expenses || []).reduce(
    (s, e) => s + (!e?.paid ? toNumber(e.amount) : 0),
    0,
  ),
);

/* -------------------------------------------
 * Filters / Sorting
 * ------------------------------------------- */
const search = ref("");
const selectedCategory = ref("");

function clearCategoryFilter() {
  selectedCategory.value = "";
}

function categoryLabel(name) {
  return String(name || "").trim();
}

/* sorting */
const sortKey = ref("date");
const sortDir = ref("desc");

/* filtered list */
const filteredExpenses = computed(() => {
  let list = finances.expenses || [];

  if (selectedCategory.value) {
    const needle = selectedCategory.value.toLowerCase();
    list = list.filter(
      (e) => (e.category || "").trim().toLowerCase() === needle,
    );
  }

  const q = (search.value || "").trim().toLowerCase();
  if (q) {
    list = list.filter((e) => {
      const label = (e.label || "").toLowerCase();
      const note = (e.note || "").toLowerCase();
      const cat = (e.category || "").toLowerCase();
      const catLabel = categoryLabelValue(e.category).toLowerCase();
      const payer = (e.payer || "").toLowerCase();
      return (
        label.includes(q) ||
        note.includes(q) ||
        cat.includes(q) ||
        catLabel.includes(q) ||
        payer.includes(q)
      );
    });
  }

  return list;
});

function compareExpenses(a, b) {
  const dir = sortDir.value === "asc" ? 1 : -1;
  const key = sortKey.value;

  let va, vb;

  if (key === "date") {
    va = toNumber(a.date);
    vb = toNumber(b.date);
  } else if (key === "amount") {
    va = toNumber(a.amount);
    vb = toNumber(b.amount);
  } else if (key === "label") {
    va = (a.label || "").toLowerCase();
    vb = (b.label || "").toLowerCase();
  } else if (key === "category") {
    va = categoryLabelValue(a.category).toLowerCase();
    vb = categoryLabelValue(b.category).toLowerCase();
  } else if (key === "payer") {
    va = (a.payer || "").toLowerCase();
    vb = (b.payer || "").toLowerCase();
  } else if (key === "paid") {
    va = a.paid ? 1 : 0;
    vb = b.paid ? 1 : 0;
  } else if (key === "note") {
    va = (a.note || "").toLowerCase();
    vb = (b.note || "").toLowerCase();
  } else {
    va = 0;
    vb = 0;
  }

  if (typeof va === "string" && typeof vb === "string") {
    return dir * va.localeCompare(vb);
  }
  return dir * (va - vb);
}

const sortedExpenses = computed(() =>
  [...filteredExpenses.value].sort(compareExpenses),
);
const visibleExpensesCount = ref(0);
const hasVisibleExpensesData = computed(() => visibleExpensesCount.value > 0);
const hasActiveFilters = computed(
  () =>
    !!(
      (search.value || "").trim() ||
      selectedCategory.value ||
      dtFilters.value?.category?.value ||
      dtFilters.value?.payer?.value ||
      dtFilters.value?.paid?.value
    ),
);

function onDataTableFilter(event) {
  const filtered = event?.filteredValue;
  visibleExpensesCount.value = Array.isArray(filtered)
    ? filtered.length
    : sortedExpenses.value.length;
}

/* paid split depends on filters (for chart) */
const paidTotalFiltered = computed(() =>
  filteredExpenses.value.reduce(
    (s, e) => s + (e.paid ? toNumber(e.amount) : 0),
    0,
  ),
);

const unpaidTotalFiltered = computed(() =>
  filteredExpenses.value.reduce(
    (s, e) => s + (!e.paid ? toNumber(e.amount) : 0),
    0,
  ),
);

/* -------------------------------------------
 * Charts
 * ------------------------------------------- */
const pieRows = computed(() => {
  const map = new Map(); // code -> total
  for (const e of finances.expenses || []) {
    const code = String(e?.category || "").trim();
    if (!code) continue;
    map.set(code, (map.get(code) || 0) + toNumber(e.amount));
  }

  return Array.from(map.entries())
    .map(([code, value]) => ({
      code,
      label: categoryLabelValue(code),
      value,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
});

const pieHasData = computed(() => pieRows.value.length > 0);

const pieData = computed(() => ({
  labels: pieRows.value.map((r) => r.label),
  datasets: [
    {
      data: pieRows.value.map((r) => r.value),
      backgroundColor: [
        "#2563eb",
        "#db2777",
        "#f59e0b",
        "#10b981",
        "#8b5cf6",
        "#ef4444",
        "#14b8a6",
        "#f97316",
      ],
    },
  ],
}));

const pieOptions = computed(() => ({
  plugins: {
    legend: {
      position: "bottom",
      onClick(e, item, legend) {
        const chart = legend.chart;
        chart.toggleDataVisibility(item.index);
        chart.update();
      },
      labels: {
        font: { size: 11 },
        boxWidth: 18,
        generateLabels(chart) {
          const datasetIndex = 0;
          const meta = chart.getDatasetMeta(datasetIndex);

          const data = chart.data.datasets?.[datasetIndex]?.data || [];
          const total = data.reduce((s, v) => s + (Number(v) || 0), 0);

          return (chart.data.labels || []).map((label, i) => {
            const value = Number(data[i]) || 0;
            const pct = total ? Math.round((value / total) * 100) : 0;
            const style = meta.controller.getStyle(i);

            return {
              text: `${label} (${pct}%)`,
              fillStyle: style.backgroundColor,
              strokeStyle: style.borderColor,
              lineWidth: style.borderWidth,
              hidden: !chart.getDataVisibility(i),
              index: i,
            };
          });
        },
      },
    },

    tooltip: {
      callbacks: {
        label(ctx) {
          const datasetIndex = ctx.datasetIndex ?? 0;
          const data = ctx.chart.data.datasets?.[datasetIndex]?.data || [];
          const total = data.reduce((s, v) => s + (Number(v) || 0), 0);

          const value = Number(ctx.raw) || 0;
          const pct = total ? Math.round((value / total) * 100) : 0;

          const amount = new Intl.NumberFormat("fr-FR", {
            maximumFractionDigits: 0,
          }).format(value);

          return `${amount} € (${pct}%)`;
        },
      },
    },
  },
  cutout: "55%",
}));

/* Paid vs unpaid chart */
const paidHasData = computed(
  () => paidTotalFiltered.value + unpaidTotalFiltered.value > 0,
);

const paidData = computed(() => ({
  labels: [
    t("admin.finances.paid", "Payé"),
    t("admin.finances.to_pay", "À payer"),
  ],
  datasets: [
    {
      data: [paidTotalFiltered.value, unpaidTotalFiltered.value],
      backgroundColor: ["#16a34a", "#ef4444"],
      // Without a right-side legend, this donut tends to render larger than the other
      // two charts; slightly reduce radius so all 3 donuts feel consistent.
      radius: "78%",
    },
  ],
}));

const paidOptions = computed(() => ({
  plugins: {
    legend: { position: "bottom" },
    tooltip: {
      callbacks: {
        label(ctx) {
          const datasetIndex = ctx.datasetIndex ?? 0;
          const data = ctx.chart.data.datasets?.[datasetIndex]?.data || [];
          const total = data.reduce((s, v) => s + (Number(v) || 0), 0);

          const value = Number(ctx.raw) || 0;
          const pct = total ? Math.round((value / total) * 100) : 0;

          const amount = new Intl.NumberFormat("fr-FR", {
            maximumFractionDigits: 0,
          }).format(value);

          return `${amount} € (${pct}%)`;
        },
      },
    },
  },
  cutout: "55%",
}));

/* -------------------------------------------
 * Delete expense
 * ------------------------------------------- */
function confirmDeleteExpense(e) {
  if (!canWriteFinances.value) return;

  const label = e?.label || "";

  confirm.require({
    header: t("common.confirm"),
    message: t("admin.finances.confirm_delete_expense").replace(
      "{label}",
      label,
    ),
    icon: "pi pi-exclamation-triangle",
    acceptLabel: t("common.delete"),
    rejectLabel: t("common.cancel"),
    acceptClass: "p-button-danger",
    rejectClass: "p-button-secondary",
    acceptIcon: "pi pi-trash",
    rejectIcon: "pi pi-times",
    accept: async () => {
      try {
        await finances.removeExpense(e.id);
        toast.add({
          severity: "success",
          summary: t("common.deleted"),
          detail: t("admin.finances.toast_expense_deleted").replace(
            "{label}",
            label,
          ),
          life: 2500,
        });
      } catch (err) {
        showApiError(t, toast, err);
      }
    },
  });
}

/* -------------------------------------------
 * Expense dialog (create/edit)
 * ------------------------------------------- */
const expenseDialogHeader = computed(() =>
  expenseMode.value === "create"
    ? t("admin.finances.exp_create", "Ajouter une dépense")
    : t("admin.finances.exp_edit", "Modifier la dépense"),
);

function makeEmptyExpenseDraft() {
  return {
    id: null,
    date: startOfTodayTs(),
    label: "",
    category: "",
    amount: 0,
    payer: "",
    paid: false,
    note: "",
  };
}

function normalizeExpenseDraft(obj) {
  const d = JSON.parse(JSON.stringify(obj || {}));
  d.id = d.id || null;
  d.date = toTimestampOrToday(d.date);
  d.label = d.label || "";
  d.category = (d.category || "").trim();
  d.payer = (d.payer || "").trim();
  d.amount = toNumber(d.amount);
  d.paid = !!d.paid;
  d.note = d.note || "";
  return d;
}

const canSaveExpense = computed(() => {
  const e = expenseDraft.value;
  if (!e) return false;
  return !!(
    (e.category || "").trim() &&
    toNumber(e.amount) > 0 &&
    (e.label || "").trim()
  );
});

function openCreateExpense() {
  if (!canWriteFinances.value) return;

  expenseMode.value = "create";
  expenseDraft.value = makeEmptyExpenseDraft();
  expenseDraftDate.value = toDate(expenseDraft.value.date);
  showExpenseDialog.value = true;
}

function openEditExpense(row) {
  if (!canWriteFinances.value) return;

  expenseMode.value = "edit";
  expenseDraft.value = normalizeExpenseDraft(row);
  expenseDraftDate.value = toDate(expenseDraft.value.date);
  showExpenseDialog.value = true;
}

function closeExpenseDialog() {
  showExpenseDialog.value = false;
  expenseDraft.value = null;
  expenseDraftDate.value = null;
}

async function saveExpenseDraft() {
  if (!canWriteFinances.value) return;

  if (!expenseDraft.value || !canSaveExpense.value) return;

  savingExpense.value = true;
  try {
    const payload = {
      date: toTimestampOrToday(expenseDraftDate.value),
      label: (expenseDraft.value.label || "").trim(),
      category: (expenseDraft.value.category || "").trim(),
      amount: toNumber(expenseDraft.value.amount),
      payer: (expenseDraft.value.payer || "").trim(),
      paid: !!expenseDraft.value.paid,
      note: (expenseDraft.value.note || "").trim(),
    };

    if (expenseMode.value === "create") {
      await finances.addExpense(payload);
      toast.add({
        severity: "success",
        summary: t("admin.toast.saved_title"),
        detail: t("admin.finances.toast_expense_created", "Dépense ajoutée."),
        life: 2500,
      });
    } else {
      if (!expenseDraft.value.id) return;
      await finances.updateExpense(expenseDraft.value.id, payload);
      toast.add({
        severity: "success",
        summary: t("admin.toast.saved_title"),
        detail: t(
          "admin.finances.toast_expense_updated",
          "Dépense mise à jour.",
        ),
        life: 2500,
      });
    }

    showExpenseDialog.value = false;
  } catch (err) {
    showApiError(t, toast, err);
  } finally {
    savingExpense.value = false;
  }
}

/* -------------------------------------------
 * Autocomplete suggestions (category / payer)
 * ------------------------------------------- */
const DEFAULT_CATEGORIES = computed(() =>
  financeCategoryOptions({ includeMisc: true, t }).map((o) => o.value),
);

const categorySuggestions = ref([]);
const payerSuggestions = ref([]);
const categoryQuery = ref("");
const payerQuery = ref("");

const categoryAll = computed(() => {
  const set = new Set(
    (DEFAULT_CATEGORIES.value || [])
      .map((x) => String(x).trim())
      .filter(Boolean),
  );

  (finances.expenses || []).forEach((e) => {
    const v = String(e?.category || "").trim();
    if (v) set.add(v);
  });

  const current = String(expenseDraft.value?.category || "").trim();
  if (current) set.add(current);

  return Array.from(set)
    .filter(Boolean)
    .sort((a, b) => categoryLabelValue(a).localeCompare(categoryLabelValue(b)));
});

const payerAll = computed(() => {
  const set = new Set();

  (finances.expenses || []).forEach((e) => {
    const v = String(e?.payer || "").trim();
    if (v) set.add(v);
  });

  const current = String(expenseDraft.value?.payer || "").trim();
  if (current) set.add(current);

  return Array.from(set)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
});

function searchExpensePayers(e) {
  payerQuery.value = String(e?.query || "").trim();
  const q = payerQuery.value.toLowerCase();

  payerSuggestions.value = !q
    ? payerAll.value.slice(0, 15)
    : payerAll.value.filter((x) => x.toLowerCase().includes(q)).slice(0, 15);
}

function commitExpensePayerFree(text) {
  const v = String(text || "").trim();
  if (!v || !expenseDraft.value) return;
  expenseDraft.value.payer = v;
  payerSuggestions.value = payerAll.value.slice(0, 15);
  payerQuery.value = "";
}

function onExpenseCategoryKeydown(ev) {
  if (ev.key !== "Enter") return;
  ev.preventDefault();
  ev.stopPropagation();
  const raw = categoryQuery.value || ev?.target?.value;
  categoryUi.value = raw;
}

function onExpensePayerKeydown(ev) {
  if (ev.key !== "Enter") return;
  ev.preventDefault();
  ev.stopPropagation();
  const raw = payerQuery.value || ev?.target?.value;
  commitExpensePayerFree(raw);
}

/* DataTable filters */
const dtFilters = ref({
  global: { value: null, matchMode: "contains" },
  category: { value: null, matchMode: "equals" },
  payer: { value: null, matchMode: "equals" },
  paid: { value: null, matchMode: "equals" },
});

watch(
  () => search.value,
  (v) => {
    dtFilters.value.global.value = (v || "").trim() || null;
  },
  { immediate: true },
);

watch(
  () => [
    search.value,
    dtFilters.value?.category?.value,
    dtFilters.value?.payer?.value,
    dtFilters.value?.paid?.value,
  ],
  () => {
    dtRef.value?.resetPage?.();
  },
);

watch(
  () => sortedExpenses.value.length,
  (len) => {
    visibleExpensesCount.value = Number(len) || 0;
  },
  { immediate: true },
);

/* Payer pie */
const payerPieRows = computed(() => {
  const map = new Map();
  for (const e of filteredExpenses.value || []) {
    const name =
      String(e?.payer || "").trim() ||
      t("admin.finances.unknown_payer", "Inconnu");
    map.set(name, (map.get(name) || 0) + toNumber(e.amount));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
});

const payerPieHasData = computed(() => payerPieRows.value.length > 0);

const payerPieData = computed(() => ({
  labels: payerPieRows.value.map((r) => r.name),
  datasets: [
    {
      data: payerPieRows.value.map((r) => r.value),
      backgroundColor: [
        "#2563eb",
        "#db2777",
        "#f59e0b",
        "#10b981",
        "#8b5cf6",
        "#ef4444",
        "#14b8a6",
        "#f97316",
      ],
    },
  ],
}));

const payerPieOptions = computed(() => ({
  plugins: {
    legend: {
      position: "bottom",
      onClick(e, item, legend) {
        const chart = legend.chart;
        chart.toggleDataVisibility(item.index);
        chart.update();
      },
      labels: {
        font: { size: 11 },
        boxWidth: 18,
      },
    },
    tooltip: {
      callbacks: {
        label(ctx) {
          const datasetIndex = ctx.datasetIndex ?? 0;
          const data = ctx.chart.data.datasets?.[datasetIndex]?.data || [];
          const total = data.reduce((s, v) => s + (Number(v) || 0), 0);

          const value = Number(ctx.raw) || 0;
          const pct = total ? Math.round((value / total) * 100) : 0;

          const amount = new Intl.NumberFormat("fr-FR", {
            maximumFractionDigits: 0,
          }).format(value);

          return `${amount} € (${pct}%)`;
        },
      },
    },
  },
  cutout: "55%",
}));

/* options */
const categoryFilterOptions = computed(() => [
  ...categoryAll.value.map((c) => ({
    label: categoryLabelValue(c),
    value: c,
  })),
]);

const payerFilterOptions = computed(() => [
  ...payerAll.value.map((p) => ({ label: p, value: p })),
]);

const paidFilterOptions = computed(() => [
  { label: t("admin.finances.paid", "Payé"), value: true },
  { label: t("admin.finances.to_pay", "À payer"), value: false },
]);

/* -------------------------------------------
 * Category helpers
 * ------------------------------------------- */
function categoryLabelValue(v) {
  const code = String(v || "").trim();
  return categoryLabelFromMeta(code, t) || code || "—";
}

function normalizeCategoryInput(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";

  const rawLower = raw.toLowerCase();

  // 1) code standard exact
  if (Object.prototype.hasOwnProperty.call(FINANCE_CATEGORY_META, raw)) {
    return raw;
  }

  // 2) label traduit -> code
  for (const code of Object.keys(FINANCE_CATEGORY_META)) {
    const label = categoryLabelValue(code);
    if (String(label).trim().toLowerCase() === rawLower) return code;
  }

  // 3) catégorie libre
  return raw;
}

const CATEGORY_SUGGEST_LIMIT = 100;

function searchExpenseCategories(e) {
  categoryQuery.value = String(e?.query || "").trim();
  const q = categoryQuery.value.toLowerCase();

  const base = categoryAll.value
    .map((c) => toCategoryOption(c))
    .filter(Boolean);

  const list = !q
    ? base
    : base.filter(
        (o) =>
          o.label.toLowerCase().includes(q) || o.code.toLowerCase().includes(q),
      );

  categorySuggestions.value = list.slice(0, CATEGORY_SUGGEST_LIMIT);
}

function toCategoryOption(raw) {
  const code = String(raw || "").trim();
  if (!code) return null;

  const label = categoryLabelValue(code);
  return { code, label: label || code };
}

const categoryUi = computed({
  get() {
    const raw = expenseDraft.value?.category;
    return toCategoryOption(raw);
  },
  set(val) {
    if (!expenseDraft.value) return;

    if (!val) {
      expenseDraft.value.category = "";
      return;
    }

    if (typeof val === "string") {
      expenseDraft.value.category = normalizeCategoryInput(val);
      return;
    }

    expenseDraft.value.category = String(val.code || "").trim();
  },
});
</script>

<style scoped>
.chartBox {
  width: 100%;
  max-width: 320px;
  margin-inline: auto;
}
@media (min-width: 768px) {
  .chartBox {
    max-width: 240px;
  }
}
@media (min-width: 1025px) {
  .chartBox {
    max-width: 260px;
  }
}

.finances-charts-grid {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}
@media (min-width: 768px) {
  .finances-charts-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1025px) {
  .finances-charts-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
:deep(table) {
  width: 100% !important;
}
:deep(.p-inputtext) {
  width: 100% !important;
}

:deep(.admin-datatable .finances-filter-select.p-select) {
  min-height: 2.35rem;
  border-radius: 0.65rem;
}

:deep(.admin-datatable .finances-filter-select .p-select-label) {
  min-height: 2.35rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  display: flex;
  align-items: center;
}
</style>
