import * as ecs from '@8thwall/ecs'

export const PANEL_ACTION = 'panel-audio:panel-action'
export const PANEL_MUTE = 'panel-audio:toggle-mute'

// Walk ancestors as well: a child can be enabled inside a disabled group.
export const isEntityActive = (world: ecs.World, entity: bigint) => {
  if (!entity || !world.allEntities.has(entity)) return false
  for (let current = entity; current; current = world.getParent(current)) {
    if (ecs.Hidden.has(world, current) || ecs.Disabled.has(world, current)) return false
  }
  return true
}

export const belongsTo = (world: ecs.World, entity: bigint, ancestor: bigint) => {
  if (!ancestor) return false
  for (let current = entity; current; current = world.getParent(current)) {
    if (current === ancestor) return true
  }
  return false
}

type PanelEntry = {panel: bigint; audio: bigint}

export const PanelAudioManager = ecs.registerComponent({
  name: 'Panel Audio Manager',

  // Keep this entity and all five audio entities outside the panel groups.
  schema: {
    // @label Enabled
    enabled: ecs.boolean,
    // @label Panel 1
    panel1: ecs.eid,
    // @label Audio 1
    audio1: ecs.eid,
    // @label Panel 2
    panel2: ecs.eid,
    // @label Audio 2
    audio2: ecs.eid,
    // @label Panel 3
    panel3: ecs.eid,
    // @label Audio 3
    audio3: ecs.eid,
    // @label Panel 4
    panel4: ecs.eid,
    // @label Audio 4
    audio4: ecs.eid,
    // @label Panel 5
    panel5: ecs.eid,
    // @label Audio 5
    audio5: ecs.eid,
  },

  schemaDefaults: {enabled: true},

  stateMachine: ({world, eid, schemaAttribute}) => {
    let activePanel = 0n
    let previous: PanelEntry[] = []
    const savedVolumes = new Map<bigint, number>()
    const warnings = new Set<string>()

    const warn = (message: string) => {
      if (warnings.has(message)) return
      warnings.add(message)
      console.warn(`Panel Audio Manager: ${message}`)
    }

    const pause = (audio: bigint, paused: boolean) => {
      if (!audio || !ecs.Audio.has(world, audio)) return
      if (ecs.Audio.get(world, audio).paused === paused) return
      // Mutate playback only; never reload the source or reset the time.
      ecs.Audio.mutate(world, audio, cursor => { cursor.paused = paused })
    }

    const close = (panel: bigint) => {
      if (panel && world.allEntities.has(panel) && !ecs.Disabled.has(world, panel)) {
        ecs.Disabled.set(world, panel)
      }
    }

    const entries = () => {
      const schema = schemaAttribute.get(eid)
      const rows: PanelEntry[] = [
        {panel: schema.panel1, audio: schema.audio1},
        {panel: schema.panel2, audio: schema.audio2},
        {panel: schema.panel3, audio: schema.audio3},
        {panel: schema.panel4, audio: schema.audio4},
        {panel: schema.panel5, audio: schema.audio5},
      ]
      const valid: PanelEntry[] = []
      rows.forEach((row, index) => {
        if (!row.panel && !row.audio) return // Unused slots are allowed.
        if (!row.panel || !world.allEntities.has(row.panel)) {
          pause(row.audio, true)
          warn(`Asigna una entidad existente en Panel ${index + 1}.`)
          return
        }
        if (belongsTo(world, eid, row.panel) || rows.some(other =>
          other.audio && belongsTo(world, other.audio, row.panel))) {
          pause(row.audio, true)
          warn(`El administrador y los audios deben estar fuera de Panel ${index + 1}.`)
          return
        }
        if (rows.some((other, otherIndex) => otherIndex !== index && other.panel &&
          (belongsTo(world, row.panel, other.panel) || belongsTo(world, other.panel, row.panel)))) {
          pause(row.audio, true)
          warn('Los paneles deben ser distintos y no pueden estar uno dentro de otro.')
          return
        }
        if (row.audio && rows.some((other, otherIndex) =>
          otherIndex !== index && other.audio === row.audio)) {
          pause(row.audio, true)
          warn('Cada panel necesita su propia entidad de audio; no repitas Audio 1–5.')
          return
        }
        if (!row.audio || !ecs.Audio.has(world, row.audio)) {
          warn(`Asigna una entidad con el componente Audio en Audio ${index + 1}.`)
        }
        valid.push(row)
      })
      return valid
    }

    const sync = () => {
      const rows = entries()
      // Reassigning a slot must not leave its former sound or panel running.
      previous.forEach(old => {
        if (!rows.some(row => row.audio === old.audio)) pause(old.audio, true)
        if (!rows.some(row => row.panel === old.panel)) close(old.panel)
      })
      previous = rows
      if (!schemaAttribute.get(eid).enabled || !isEntityActive(world, eid) ||
        !rows.some(row => row.panel === activePanel) || !isEntityActive(world, activePanel)) {
        activePanel = 0n
      }

      // Stop every other sound before resuming the selected sound.
      rows.forEach(({panel, audio}) => {
        if (panel !== activePanel) {
          pause(audio, true)
          close(panel)
        }
        if (audio && ecs.Audio.has(world, audio)) {
          const volume = ecs.Audio.get(world, audio).volume
          if (volume > 0) savedVolumes.set(audio, volume)
        }
      })
      const selected = rows.find(row => row.panel === activePanel)
      if (selected) pause(selected.audio, !isEntityActive(world, selected.audio))
    }

    ecs.defineState('ready').initial()
      // Start with all panels closed and all audio paused.
      .onEnter(sync)
      .onTick(sync)
      .onExit(() => {
        previous.forEach(({panel, audio}) => { pause(audio, true); close(panel) })
        activePanel = 0n
      })
      .listen(eid, PANEL_ACTION, ({data}) => {
        const request = data as {panel?: bigint; open?: boolean} | undefined
        if (!request || typeof request.panel !== 'bigint' || typeof request.open !== 'boolean') return
        if (!schemaAttribute.get(eid).enabled || !isEntityActive(world, eid)) return
        const rows = entries()
        const selected = rows.find(row => row.panel === request.panel)
        if (!selected) {
          warn('El panel solicitado no está configurado correctamente en Panel 1–5.')
          return
        }
        if (request.open) {
          const parent = world.getParent(selected.panel)
          if (parent && !isEntityActive(world, parent)) {
            warn('Activa el padre del panel antes de abrirlo.')
            return
          }
          rows.forEach(({panel, audio}) => {
            if (panel !== selected.panel) { pause(audio, true); close(panel) }
          })
          if (ecs.Disabled.has(world, selected.panel)) ecs.Disabled.remove(world, selected.panel)
          if (ecs.Hidden.has(world, selected.panel)) ecs.Hidden.remove(world, selected.panel)
          activePanel = selected.panel
        } else {
          pause(selected.audio, true)
          close(selected.panel)
          if (activePanel === selected.panel) activePanel = 0n
        }
        sync()
      })
      .listen(eid, PANEL_MUTE, ({data}) => {
        const request = data as {panel?: bigint} | undefined
        if (!request || request.panel !== activePanel || !isEntityActive(world, activePanel) ||
          !schemaAttribute.get(eid).enabled || !isEntityActive(world, eid)) return
        const selected = entries().find(row => row.panel === activePanel)
        if (!selected?.audio || !ecs.Audio.has(world, selected.audio)) return
        const {volume} = ecs.Audio.get(world, selected.audio)
        if (volume > 0) savedVolumes.set(selected.audio, volume)
        ecs.Audio.mutate(world, selected.audio, cursor => {
          cursor.volume = volume > 0 ? 0 : (savedVolumes.get(selected.audio) || 1)
        })
      })
  },
})

// The mute button resolves its sound from the same mapping as the manager.
export const getPanelAudio = (world: ecs.World, manager: bigint, panel: bigint) => {
  if (!manager || !panel || !PanelAudioManager.has(world, manager)) return 0n
  const schema = PanelAudioManager.get(world, manager)
  if (schema.panel1 === panel) return schema.audio1
  if (schema.panel2 === panel) return schema.audio2
  if (schema.panel3 === panel) return schema.audio3
  if (schema.panel4 === panel) return schema.audio4
  if (schema.panel5 === panel) return schema.audio5
  return 0n
}
