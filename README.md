# Rain & Water Effect Experiments

Some experimental rain and water drop effects in different scenarios using WebGL, by Lucas Bebber.

[Article on Codrops](http://tympanus.net/codrops/?p=25417)

[Demo](http://tympanus.net/Development/RainEffect/)

## License

Integrate or build upon it for free in your personal or commercial projects. Don't republish, redistribute or sell "as-is".

Read more here: [License](http://tympanus.net/codrops/licensing/)

## Misc

Follow Lucas: [Twitter](http://twitter.com/lucasbebber), [Dribbble](https://dribbble.com/lbebber), [Flickr](https://www.flickr.com/lbebber)

Follow Codrops: [Twitter](http://www.twitter.com/codrops), [Facebook](http://www.facebook.com/pages/Codrops/159107397912), [Google+](https://plus.google.com/101095823814290637419), [GitHub](https://github.com/codrops), [Pinterest](http://www.pinterest.com/codrops/)

[© Codrops 2015](http://www.codrops.com)

```
# Install browserify and uglify globally
npm install -g browserify uglify-js

# Create the demo/js directory if it doesn't exist
mkdir demo\js

# Build each file
browserify src/index.js -t babelify -t glslify | uglifyjs > demo/js/index.min.js
browserify src/index2.js -t babelify -t glslify | uglifyjs > demo/js/index2.min.js
browserify src/index3.js -t babelify -t glslify | uglifyjs > demo/js/index3.min.js

```
