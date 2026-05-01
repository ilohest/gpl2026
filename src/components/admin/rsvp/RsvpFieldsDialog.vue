<!-- src/pages/admin/rsvp/RsvpFieldsDialog.vue -->
<template>
  <Fieldset
    :legend="t('admin.responses.attending')"
    class="w-full bg-transparent p-0 border-0 shadow-none text-sm shared-rsvp-fieldset"
  >
    <SelectButton
      v-model="attendingModel"
      :options="yesNoOptions"
      option-label="label"
      option-value="value"
      :pt="selectPt"
      class="w-full"
      @update:model-value="onAttendingChange"
    />
  </Fieldset>

  <Fieldset
    :legend="t('admin.responses.wedding_event_parts')"
    class="w-full bg-transparent p-0 border-0 shadow-none text-sm shared-rsvp-fieldset"
  >
    <SelectButton
      v-model="weddingPartsModel"
      :options="weddingPartOptions"
      option-label="label"
      option-value="value"
      multiple
      :pt="selectPt"
      class="w-full shared-rsvp-multi-select"
      :disabled="isNotAttending"
    />
  </Fieldset>

  <Fieldset
    :legend="t('admin.responses.transport')"
    class="w-full bg-transparent p-0 border-0 shadow-none text-sm shared-rsvp-fieldset"
  >
    <SelectButton
      v-model="transportModel"
      :options="transportOptions"
      option-label="label"
      option-value="value"
      :pt="selectPt"
      class="w-full"
      :disabled="isNotAttending"
    />
  </Fieldset>

  <Fieldset
    :legend="t('admin.responses.restrictions')"
    class="w-full bg-transparent p-0 border-0 shadow-none text-sm shared-rsvp-fieldset"
  >
    <SelectButton
      v-model="dietCodesModel"
      :options="dietOptions"
      option-label="label"
      option-value="value"
      multiple
      :pt="selectPt"
      class="w-full shared-rsvp-multi-select"
      :disabled="isNotAttending"
    />

    <div
      v-if="
        !isNotAttending &&
          Array.isArray(dietCodesModel) &&
          dietCodesModel.includes('other')
      "
      class="mt-2"
    >
      <label class="text-xs md:text-sm">{{
        t("rsvp.form.diet_details")
      }}</label>
      <InputText
        v-model="dietOtherTextModel"
        class="w-full p-inputtext-sm mt-1"
        :disabled="isNotAttending"
      />
    </div>
  </Fieldset>
</template>

<script setup>
import { computed } from "vue";
import Fieldset from "primevue/fieldset";
import SelectButton from "primevue/selectbutton";
import InputText from "primevue/inputtext";
import { useLang } from "@/composables/useLang";

const props = defineProps({
  attending: { type: String, default: "yes" },
  transport: { type: String, default: "no" },
  weddingEventParts: { type: Array, default: () => [] },
  dietCodes: { type: Array, default: () => [] },
  dietOtherText: { type: String, default: "" },
  yesNoOptions: { type: Array, required: true },
  transportOptions: { type: Array, required: true },
  weddingPartOptions: { type: Array, required: true },
  dietOptions: { type: Array, required: true },
  selectPt: { type: Object, required: true },
});

const emit = defineEmits([
  "update:attending",
  "update:transport",
  "update:weddingEventParts",
  "update:dietCodes",
  "update:dietOtherText",
  "attending-change",
]);

const { t } = useLang();

const isNotAttending = computed(
  () => String(props.attending || "yes").toLowerCase() !== "yes",
);

const attendingModel = computed({
  get: () => props.attending,
  set: (v) => emit("update:attending", v),
});
const transportModel = computed({
  get: () => props.transport,
  set: (v) => emit("update:transport", v),
});
const weddingPartsModel = computed({
  get: () => props.weddingEventParts,
  set: (v) => emit("update:weddingEventParts", v),
});
const dietCodesModel = computed({
  get: () => props.dietCodes,
  set: (v) => emit("update:dietCodes", v),
});
const dietOtherTextModel = computed({
  get: () => props.dietOtherText,
  set: (v) => emit("update:dietOtherText", v),
});

function onAttendingChange(value) {
  emit("attending-change", value);
}
</script>

<style scoped>
:deep(.shared-rsvp-fieldset.p-fieldset) {
  border-radius: 1rem;
  border: 1px solid #d1d5db;
}

:deep(.shared-rsvp-fieldset .p-fieldset-legend-label) {
  font-weight: 500 !important;
}

:deep(.shared-rsvp-fieldset .p-selectbutton) {
  width: 100%;
}

:deep(.shared-rsvp-fieldset .p-selectbutton .p-button) {
  border-radius: 1rem;
}

:deep(.shared-rsvp-multi-select.p-selectbutton) {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

:deep(.shared-rsvp-multi-select.p-selectbutton .p-button) {
  width: 100%;
}

@media (min-width: 768px) {
  :deep(.shared-rsvp-multi-select.p-selectbutton) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }
}
</style>
