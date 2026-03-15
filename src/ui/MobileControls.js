/**
 * MobileControls — virtual joystick (left thumb) + jump button (right)
 *
 * Rendered as HTML DOM elements overlaid on top of the Babylon canvas.
 * Only visible/active on touch-capable devices.
 *
 * Usage:
 *   const mc = new MobileControls();
 *   mc.init();                        // creates DOM, attaches events
 *   mc.getMovement()                  // → { x, y } in [-1, 1]
 *   mc.consumeJump()                  // → true once per tap
 *   mc.destroy()                      // removes DOM on scene change
 */
export class MobileControls {
  constructor() {
    this._container = null;
    this._joystickZone = null;
    this._stick = null;
    this._jumpBtn = null;

    // Joystick state
    this._joystickId = null;
    this._joystickCenter = { x: 0, y: 0 };
    this._moveX = 0;
    this._moveY = 0;
    this._maxRadius = 45;

    // Jump state — consumed once per press
    this._jumpPending = false;
  }

  /** Returns true if the current device supports touch (mobile / tablet) */
  static isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  init() {
    if (!MobileControls.isTouchDevice()) return; // desktop — nothing to do
    this._buildDOM();
    this._attachEvents();
  }

  // ─── DOM ──────────────────────────────────────────────────────────────────

  _buildDOM() {
    /* ── outer wrapper ── */
    this._container = document.createElement('div');
    this._container.id = 'mobile-controls';
    Object.assign(this._container.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '220px',
      pointerEvents: 'none',
      zIndex: '200',
      userSelect: 'none',
      webkitUserSelect: 'none',
    });

    /* ── joystick base ring ── */
    this._joystickZone = document.createElement('div');
    Object.assign(this._joystickZone.style, {
      position: 'absolute',
      left: '24px',
      bottom: '24px',
      width: '130px',
      height: '130px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.07)',
      border: '2px solid rgba(255,255,255,0.22)',
      pointerEvents: 'all',
      touchAction: 'none',
      boxSizing: 'border-box',
    });

    /* ── joystick thumb ── */
    this._stick = document.createElement('div');
    Object.assign(this._stick.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      background: 'rgba(79,195,247,0.55)',
      border: '2px solid rgba(79,195,247,0.9)',
      pointerEvents: 'none',
      transition: 'background 0.1s',
      boxSizing: 'border-box',
    });
    this._joystickZone.appendChild(this._stick);
    this._container.appendChild(this._joystickZone);

    /* ── jump button ── */
    this._jumpBtn = document.createElement('div');
    Object.assign(this._jumpBtn.style, {
      position: 'absolute',
      right: '28px',
      bottom: '44px',
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      background: 'rgba(255,180,0,0.45)',
      border: '2px solid rgba(255,200,60,0.8)',
      pointerEvents: 'all',
      touchAction: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      fontWeight: '700',
      color: 'rgba(255,255,255,0.9)',
      fontFamily: 'sans-serif',
      letterSpacing: '0.05em',
      boxSizing: 'border-box',
    });
    this._jumpBtn.textContent = 'JUMP';
    this._container.appendChild(this._jumpBtn);

    document.body.appendChild(this._container);
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  _attachEvents() {
    const zone = this._joystickZone;

    zone.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      if (this._joystickId !== null) return;
      const t = e.changedTouches[0];
      this._joystickId = t.identifier;
      const rect = zone.getBoundingClientRect();
      this._joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this._applyJoystick(t.clientX, t.clientY);
      this._stick.style.background = 'rgba(79,195,247,0.8)';
    }, { passive: false });

    zone.addEventListener('touchmove', e => {
      e.preventDefault();
      e.stopPropagation();
      const t = Array.from(e.changedTouches).find(t => t.identifier === this._joystickId);
      if (t) this._applyJoystick(t.clientX, t.clientY);
    }, { passive: false });

    const endJoystick = e => {
      const t = Array.from(e.changedTouches).find(t => t.identifier === this._joystickId);
      if (!t) return;
      this._joystickId = null;
      this._moveX = 0;
      this._moveY = 0;
      this._stick.style.transform = 'translate(-50%, -50%)';
      this._stick.style.background = 'rgba(79,195,247,0.55)';
    };
    zone.addEventListener('touchend',    endJoystick, { passive: true });
    zone.addEventListener('touchcancel', endJoystick, { passive: true });

    /* ── jump ── */
    this._jumpBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      this._jumpPending = true;
      this._jumpBtn.style.background = 'rgba(255,200,60,0.8)';
    }, { passive: false });

    const endJump = e => {
      e.stopPropagation();
      this._jumpBtn.style.background = 'rgba(255,180,0,0.45)';
    };
    this._jumpBtn.addEventListener('touchend',    endJump, { passive: true });
    this._jumpBtn.addEventListener('touchcancel', endJump, { passive: true });
  }

  _applyJoystick(cx, cy) {
    const dx = cx - this._joystickCenter.x;
    const dy = cy - this._joystickCenter.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(len, this._maxRadius);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    this._moveX = nx * (clamped / this._maxRadius);
    this._moveY = ny * (clamped / this._maxRadius);
    // Move the thumb indicator
    const ox = nx * clamped;
    const oy = ny * clamped;
    this._stick.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Returns the current joystick direction.
   * x: -1 (left) … +1 (right)
   * y: -1 (up/forward) … +1 (down/backward)
   */
  getMovement() {
    return { x: this._moveX, y: this._moveY };
  }

  /**
   * Returns true if the jump button was pressed since the last call.
   * Clears the pending flag on read (edge-triggered).
   */
  consumeJump() {
    if (this._jumpPending) {
      this._jumpPending = false;
      return true;
    }
    return false;
  }

  /** Remove the DOM overlay (call when switching scenes) */
  destroy() {
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._container = null;
  }
}
