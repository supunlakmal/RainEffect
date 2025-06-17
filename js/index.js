window.onload = function() {
  const canvas = document.getElementById('container');
  if (canvas && canvas.getContext) {
    // Set actual canvas drawing dimensions based on display size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const ctx = canvas.getContext('2d');
    const textToDraw = 'SUPUN';
    const defaultColor = 'red';
    const clickedColor = 'blue';
    const fontSize = 48; // Store font size for bounding box calculation
    const fontFamily = 'serif';

    function drawText(color) {
      // Clear the canvas before drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle'; // Align text vertically to the middle for easier bounding box calculation
      ctx.fillText(textToDraw, canvas.width / 2, canvas.height / 2);
    }

    // Initial draw
    drawText(defaultColor);

    canvas.addEventListener('click', function(event) {
      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Get text metrics
      ctx.font = `${fontSize}px ${fontFamily}`; // Ensure font is set for measureText
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textMetrics = ctx.measureText(textToDraw);

      // Approximate bounding box
      // For textAlign = 'center' and textBaseline = 'middle'
      const textWidth = textMetrics.width;
      const textHeight = fontSize; // Approximation, actual height might vary

      const textX = (canvas.width / 2) - (textWidth / 2);
      const textY = (canvas.height / 2) - (textHeight / 2); // Approximate top Y

      // Check if click is within the bounding box
      if (clickX >= textX && clickX <= textX + textWidth &&
          clickY >= textY && clickY <= textY + textHeight) {
        drawText(clickedColor);
      } else {
        drawText(defaultColor);
      }
    });

  } else {
    console.error("Canvas element with ID 'container' not found or context not supported.");
  }
};
