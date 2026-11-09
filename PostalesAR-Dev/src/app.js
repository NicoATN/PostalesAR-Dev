const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/postal araza-1.json'),
      require('../image-targets/postal araza-2.json'),
      require('../image-targets/postal uva-1.json'),
      require('../image-targets/postal uva-2.json'),
      require('../image-targets/postal chontaduro-1.json'),
      require('../image-targets/postal chontaduro-2.json'),
      require('../image-targets/postal mojojoyy-1.json'),
      require('../image-targets/postal mojojoyy-2.json'),
      require('../image-targets/postal casabe-1.json'),
      require('../image-targets/postal casabe-2.json'),
      require('../image-targets/postal cana-1.json'),
      require('../image-targets/postal cana-2.json'),
      require('../image-targets/postal aji negro-1.json'),
      require('../image-targets/postal aji negro-2.json')
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)