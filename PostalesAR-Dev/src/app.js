const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/tiro uva.json'),
      require('../image-targets/tiro chontaduro.json'),
      require('../image-targets/tiro casabe.json'),
      require('../image-targets/tiro aji negro.json'),
      require('../image-targets/tiro azara.json'),
      require('../image-targets/tiro canangucha.json'),
      require('../image-targets/tiro mojojoy.json'),
      require('../image-targets/retiro mojojoy.json'),
      require('../image-targets/retiro canagucha.json'),
      require('../image-targets/retiro chontaduro.json'),
      require('../image-targets/retiro azara.json'),
      require('../image-targets/retiro casabe.json'),
      require('../image-targets/retiro aji negro.json'),
      require('../image-targets/retiro uva.json')
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)