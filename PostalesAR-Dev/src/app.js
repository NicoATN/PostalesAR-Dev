const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/tiro uva.json'),
      require('../image-targets/UVA CAMAIRONA-Retiro.json'),
      require('../image-targets/tiro chontaduro.json'),
      require('../image-targets/tiro casabe.json'),
      require('../image-targets/tiro aji negro.json'),
      require('../image-targets/tiro azara.json'),
      require('../image-targets/tiro canangucha.json'),
      require('../image-targets/tiro mojojoy.json')
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)