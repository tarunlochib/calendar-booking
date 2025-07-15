const nodemon = require('nodemon');

nodemon({
  script: 'index.js',
  ext: 'js json',
  watch: ['index.js', 'routes', 'controllers', 'models'], // add folders as needed
});

nodemon.on('start', function () {
  console.log('Nodemon has started');
}).on('quit', function () {
  console.log('Nodemon has quit');
  process.exit();
}).on('restart', function (files) {
  console.log('Nodemon restarted due to: ', files);
}); 