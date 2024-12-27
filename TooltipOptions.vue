<!--
 * @Name: TooltipOptions
 * @Module:
 * @Desc:
 * @Path: src/components/tooltip
 * @Author: zhangjiaqi
 * @Date: 2024/12/26
-->

<template>
  <transition :name="transition" @after-leave="doDestroy">
    <div
      @mouseleave="onMouseleave"
      @mouseenter="onMouseenter"
      ref="popper"
      role="tooltip"
      :id="tooltipId"
      :aria-hidden="!!(disabled || !showPopper)"
      v-show="!disabled && showPopper"
      :class="['el-tooltip__popper', 'is-' + effect, popperClass]"
    >
      <slot name="content">{{ content }}</slot>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'TooltipOptions',
  props: {
    doDestroy: Function,
    debounceClose: Function,
    setExpectedState: Function,
    tooltipId: undefined,
    showPopper: Boolean,
    disabled: Boolean,
    content: String,
    effect: {
      type: String,
      default: 'dark'
    },
    arrowOffset: {
      type: Number,
      default: 0
    },
    popperClass: String,
    transition: {
      type: String,
      default: 'el-fade-in-linear'
    }
  },
  mounted() {},
  methods: {
    onMouseenter() {
      this.setExpectedState(true)
    },
    onMouseleave() {
      this.setExpectedState(false)
      this.debounceClose()
    },
    afterLeave() {
      console.log(this.doDestroy)
    }
  }
}
</script>

<style scoped lang="scss"></style>
