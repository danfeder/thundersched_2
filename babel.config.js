export default {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current' // Target the current Node version for Jest
      },
      modules: 'auto' // Allow Babel to transform ES modules for Jest/Node
    }]
  ]
};