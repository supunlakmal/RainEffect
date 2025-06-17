var gulp = require("gulp"),
  fs = require("fs"),
  source = require("vinyl-source-stream"),
  browserify = require("browserify"),
  uglify = require("gulp-uglify"),
  streamify = require("gulp-streamify"),
  babelify = require("babelify");

function compileJS(file) {
  return browserify("src/" + file + ".js", { debug: true })
    .transform(babelify)
    .transform("glslify")
    .bundle()
    .on("error", function (err) {
      console.log("Error : " + err.message);
      this.emit("end");
    })
    .pipe(source(file + ".min.js"))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest("demo/js"));
}

// Define individual tasks
gulp.task("js1", function () {
  return compileJS("index");
});

gulp.task("js2", function () {
  return compileJS("index2");
});

gulp.task("js3", function () {
  return compileJS("index3");
});

// Define default task
gulp.task("default", gulp.series("js1", "js2", "js3"));
