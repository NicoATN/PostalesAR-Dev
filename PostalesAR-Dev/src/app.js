const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/UVA CAMAIRONA-Tiro.json'),
      require('../image-targets/UVA CAMAIRONA-Retiro.json')
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)