import * as ecs from '@8thwall/ecs'
import {belongsTo, getPanelAudio, isEntityActive, PANEL_MUTE, PanelAudioManager} from './PanelAudioManager'

ecs.registerComponent({
  name: 'Audio Mute Button',

  schema: {
    // @label Enabled
    enabled: ecs.boolean,
    // @label Panel Manager
    panelManager: ecs.eid,
    // The same panel used by this panel's Open and Close buttons.
    // @label Panel Entity
    panelEntity: ecs.eid,
    // Two overlapping image children of this button, both enabled in the editor.
    // @label Sound On Icon
    soundOnIcon: ecs.eid,
    // @label Muted Icon
    mutedIcon: ecs.eid,
  },

  schemaDefaults: {enabled: true},

  stateMachine: ({world, eid, schemaAttribute}) => {
    const taps = new Set<number>()
    const maxTapMovement = 0.025
    let warnedIcons = false

    const syncIcons = () => {
      const {panelManager, panelEntity, soundOnIcon, mutedIcon} = schemaAttribute.get(eid)
      const audio = getPanelAudio(world, panelManager, panelEntity)
      if (!audio || !ecs.Audio.has(world, audio)) return
      // Icons must be separate children, never the button, panel or their parents.
      const validIcon = (icon: bigint) => icon && icon !== eid && world.allEntities.has(icon) &&
        belongsTo(world, icon, eid)
      if (!validIcon(soundOnIcon) || !validIcon(mutedIcon) || soundOnIcon === mutedIcon ||
        belongsTo(world, soundOnIcon, mutedIcon) || belongsTo(world, mutedIcon, soundOnIcon)) {
        if (!warnedIcons) {
          console.warn('Audio Mute Button: asigna dos imágenes hijas distintas en Sound On Icon y Muted Icon.')
          warnedIcons = true
        }
        return
      }
      warnedIcons = false
      const muted = ecs.Audio.get(world, audio).volume <= 0
      const show = (icon: bigint, visible: boolean) => {
        if (visible && ecs.Hidden.has(world, icon)) ecs.Hidden.remove(world, icon)
        if (!visible && !ecs.Hidden.has(world, icon)) ecs.Hidden.set(world, icon)
      }
      show(soundOnIcon, !muted)
      show(mutedIcon, muted)
    }

    const hitsButton = (entity: bigint | undefined, ui: boolean) => {
      if (!entity || !isEntityActive(world, entity)) return false
      let belongsToButton = false
      let isUi = false
      for (let current = entity; current; current = world.getParent(current)) {
        if (current === eid) belongsToButton = true
        if (ecs.Ui.has(world, current)) isUi = true
      }
      return belongsToButton && isUi === ui
    }

    const toggle = () => {
      const {enabled, panelManager, panelEntity} = schemaAttribute.get(eid)
      if (!enabled || !isEntityActive(world, panelEntity)) return
      if (!panelManager || !PanelAudioManager.has(world, panelManager) || !isEntityActive(world, panelManager)) {
        console.warn('Audio Mute Button: asigna un Panel Audio Manager activo en Panel Manager.')
        return
      }
      const audio = getPanelAudio(world, panelManager, panelEntity)
      if (!audio || !ecs.Audio.has(world, audio)) {
        console.warn('Audio Mute Button: asigna el panel y su audio en Panel Audio Manager.')
        return
      }
      world.events.dispatch(panelManager, PANEL_MUTE, {panel: panelEntity})
    }

    ecs.defineState('ready').initial()
      .onEnter(syncIcons)
      .onTick(syncIcons)
      .onExit(() => taps.clear())
      .listen(world.events.globalId, ecs.input.UI_CLICK, event => {
        if (hitsButton(event.target, true)) toggle()
      })
      .listen(world.events.globalId, ecs.input.SCREEN_TOUCH_START, ({data}) => {
        taps.delete(data.pointerId)
        if (schemaAttribute.get(eid).enabled && hitsButton(data.target, false)) taps.add(data.pointerId)
      })
      .listen(world.events.globalId, ecs.input.SCREEN_TOUCH_MOVE, ({data}) => {
        const distance = Math.hypot(data.position.x - data.start.x, data.position.y - data.start.y)
        if (distance > maxTapMovement) taps.delete(data.pointerId)
      })
      .listen(world.events.globalId, ecs.input.GESTURE_START, ({data}) => {
        if (data.touchCount > 1) taps.clear()
      })
      .listen(world.events.globalId, ecs.input.SCREEN_TOUCH_END, ({data}) => {
        if (!taps.delete(data.pointerId)) return
        if (!hitsButton(data.target, false) || !hitsButton(data.endTarget, false)) return
        const distance = Math.hypot(data.position.x - data.start.x, data.position.y - data.start.y)
        if (distance <= maxTapMovement) toggle()
      })
  },
})
