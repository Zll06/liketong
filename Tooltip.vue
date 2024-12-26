<!--
 * @Name: Tooltip
 * @Module:
 * @Desc:
 * @Path: src/components/tooltip
 * @Author: zhangjiaqi
 * @Date: 2024/12/26
-->

<script>
import _ from "lodash";
import Vue from "vue";
import popperMixin from "./popper.mixin";
import TooltipOptions from "./TooltipOptions.vue";

const isServer = Vue.prototype.$isServer;

/* istanbul ignore next */
const on = (function () {
  if (!isServer && document.addEventListener) {
    return function (element, event, handler) {
      if (element && event && handler) {
        element.addEventListener(event, handler, false);
      }
    };
  } else {
    return function (element, event, handler) {
      if (element && event && handler) {
        element.attachEvent("on" + event, handler);
      }
    };
  }
})();

/* istanbul ignore next */
const off = (function () {
  if (!isServer && document.removeEventListener) {
    return function (element, event, handler) {
      if (element && event) {
        element.removeEventListener(event, handler, false);
      }
    };
  } else {
    return function (element, event, handler) {
      if (element && event) {
        element.detachEvent("on" + event, handler);
      }
    };
  }
})();

function addClass(el, cls) {
  if (!el || !(el instanceof HTMLElement)) return;
  const classes = (cls || "").trim().split(/\s+/).filter(Boolean);
  try {
    for (const clsName of classes) {
      if (el.classList) {
        el.classList.add(clsName);
      } else if (!hasClass(el, clsName)) {
        el.className += ` ${clsName}`;
      }
    }
  } catch (error) {
    console.error("Error adding class:", error);
  }
  if (!el.classList) {
    el.setAttribute("class", el.className.trim());
  }
}
function hasClass(el, cls) {
  return el.className.split(/\s+/).includes(cls);
}
function removeClass(el, cls) {
  // 类型检查
  if (!el || typeof el !== "object" || !cls || typeof cls !== "string") return;

  // 去重并分割类名
  const classes = Array.from(new Set(cls.split(" "))).filter(Boolean);

  if (el.classList) {
    // 使用 classList 移除类名
    classes.forEach((clsName) => {
      el.classList.remove(clsName);
    });
  } else {
    // 兼容不支持 classList 的浏览器
    let curClass = " " + el.className + " ";
    classes.forEach((clsName) => {
      curClass = curClass.replace(" " + clsName + " ", " ");
    });
    el.setAttribute("class", curClass.trim());
  }
}

export default {
  name: "Tooltip",
  mixins: [popperMixin],
  props: {
    openDelay: {
      type: Number,
      default: 0,
    },
    disabled: Boolean,
    manual: Boolean,
    effect: {
      type: String,
      default: "dark",
    },
    arrowOffset: {
      type: Number,
      default: 0,
    },
    popperClass: String,
    content: String,
    visibleArrow: {
      default: true,
    },
    transition: {
      type: String,
      default: "el-fade-in-linear",
    },
    popperOptions: {
      default() {
        return {
          boundariesPadding: 10,
          gpuAcceleration: false,
        };
      },
    },
    enterable: {
      type: Boolean,
      default: true,
    },
    hideAfter: {
      type: Number,
      default: 0,
    },
    tabindex: {
      type: Number,
      default: 0,
    },
  },

  data() {
    return {
      tooltipId: `el-tooltip-${new Date().getTime()}`,
      timeoutPending: null,
      focusing: false,
    };
  },
  beforeCreate() {
    if (this.$isServer) return;
    this.popperVM = new Vue({
      data: { node: "" },
      render(h) {
        return this.node;
      },
    }).$mount();
    this.debounceClose = _.debounce(() => this.handleClosePopper(), 200);
  },

  render(h) {
    if (this.popperVM) {
      this.popperVM.node = h(TooltipOptions, {
        doDestroy: this.doDestroy,
        debounceClose: this.debounceClose,
        setExpectedState: this.setExpectedState,
        showPopper: this.showPopper,
        disabled: this.disabled,
        effect: this.effect,
        arrowOffset: this.arrowOffset,
        popperClass: this.popperClass,
        transition: this.transition,
      });
    }

    const firstElement = this.getFirstElement();
    if (!firstElement) return null;

    const data = (firstElement.data = firstElement.data || {});
    data.staticClass = this.addTooltipClass(data.staticClass);

    return h("div", { class: "tooltip-body" }, [firstElement]);
  },

  mounted() {
    this.referenceElm = this.$el;
    if (this.$el.nodeType === 1) {
      this.$el.setAttribute("aria-describedby", this.tooltipId);
      this.$el.setAttribute("tabindex", this.tabindex);
      on(this.referenceElm, "mouseenter", this.show);
      on(this.referenceElm, "mouseleave", this.hide);
      on(this.referenceElm, "focus", () => {
        if (!this.$slots.default || !this.$slots.default.length) {
          this.handleFocus();
          return;
        }
        const instance = this.$slots.default[0].componentInstance;
        if (instance && instance.focus) {
          instance.focus();
        } else {
          this.handleFocus();
        }
      });
      on(this.referenceElm, "blur", this.handleBlur);
      on(this.referenceElm, "click", this.removeFocusing);
    }
    // fix issue https://github.com/ElemeFE/element/issues/14424
    if (this.value && this.popperVM) {
      this.popperVM.$nextTick(() => {
        if (this.value) {
          this.updatePopper();
        }
      });
    }
  },
  watch: {
    focusing(val) {
      if (val) {
        addClass(this.referenceElm, "focusing");
      } else {
        removeClass(this.referenceElm, "focusing");
      }
    },
  },
  methods: {
    show() {
      this.setExpectedState(true);
      this.handleShowPopper();
    },

    hide() {
      this.setExpectedState(false);
      this.debounceClose();
    },
    handleFocus() {
      this.focusing = true;
      this.show();
    },
    handleBlur() {
      this.focusing = false;
      this.hide();
    },
    removeFocusing() {
      this.focusing = false;
    },

    addTooltipClass(prev) {
      if (!prev) {
        return "el-tooltip";
      } else {
        return "el-tooltip " + prev.replace("el-tooltip", "");
      }
    },

    handleShowPopper() {
      if (!this.expectedState || this.manual) return;
      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        this.showPopper = true;
      }, this.openDelay);

      if (this.hideAfter > 0) {
        this.timeoutPending = setTimeout(() => {
          this.showPopper = false;
        }, this.hideAfter);
      }
    },

    handleClosePopper() {
      if ((this.enterable && this.expectedState) || this.manual) return;
      clearTimeout(this.timeout);

      if (this.timeoutPending) {
        clearTimeout(this.timeoutPending);
      }
      this.showPopper = false;

      if (this.disabled) {
        this.doDestroy();
      }
    },

    setExpectedState(expectedState) {
      if (expectedState === false) {
        clearTimeout(this.timeoutPending);
      }
      this.expectedState = expectedState;
    },

    getFirstElement() {
      const slots = this.$slots.default;
      if (!Array.isArray(slots)) return null;
      let element = null;
      for (let index = 0; index < slots.length; index++) {
        if (slots[index] && slots[index].tag) {
          element = slots[index];
          break;
        }
      }
      return element;
    },
  },

  beforeDestroy() {
    this.popperVM && this.popperVM.$destroy();
  },

  destroyed() {
    const reference = this.referenceElm;
    if (reference.nodeType === 1) {
      off(reference, "mouseenter", this.show);
      off(reference, "mouseleave", this.hide);
      off(reference, "focus", this.handleFocus);
      off(reference, "blur", this.handleBlur);
      off(reference, "click", this.removeFocusing);
    }
  },
};
</script>

<style scoped lang="scss"></style>
