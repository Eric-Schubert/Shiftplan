<script setup lang="ts">
import { useRotationPatternInteractions } from "~/composables/useRotationPatternInteractions";

const dataStore = useDataStore();

const {
  dragOverTarget,
  showAssignDialog,
  assignContext,
  assigning,
  availableStaffForAssign,
  openAssignDialog,
  assignStaff,
  unassignStaff,
  onPoolDragStart,
  onChipDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
} = useRotationPatternInteractions();
</script>

<template>
  <div class="space-y-4">
    <RotationPatternIntro
      :cycle-length="dataStore.rotationPattern?.config.cycle_length || 4"
      :start-week="dataStore.rotationPattern?.config.start_week || 1"
      :start-year="dataStore.rotationPattern?.config.start_year || 2026"
    />

    <RotationStaffPool
      :staff="dataStore.activeStaff"
      @drag-start="onPoolDragStart"
    />

    <div v-if="dataStore.loadingRotation" class="flex justify-center py-8">
      <PrimeProgressSpinner />
    </div>

    <div v-else-if="dataStore.rotationPattern" class="space-y-4">
      <RotationPatternWeekCard
        v-for="weekData in dataStore.rotationPattern.weeks"
        :key="weekData.pattern_week"
        :week-data="weekData"
        :active-drop-target="dragOverTarget"
        @drag-over="onDragOver"
        @drag-leave="onDragLeave"
        @drop-staff="onDrop"
        @open-assign="openAssignDialog"
        @staff-drag-start="onChipDragStart"
        @unassign-staff="unassignStaff"
      />
    </div>

    <RotationAssignDialog
      :visible="showAssignDialog"
      :context="assignContext"
      :available-staff="availableStaffForAssign"
      :assigning="assigning"
      @update:visible="showAssignDialog = $event"
      @assign="assignStaff"
    />
  </div>
</template>
