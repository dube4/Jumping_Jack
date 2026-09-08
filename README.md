# Jumping_Jack
A Chrome Dino-inspired game developed using JavaScript, WebGL, HTML and CSS.
This Chrome Dino–style WebGL called Jumping jack game lets you control a simple square–based dinosaur that jumps over obstacles while the environment transitions from day to night .The game gets a little bit harder when it is night as the speed of the obstacles increases.

How to run:
git clone https://github.com/dube4/Jumping_Jack.git
Press Spacebar:
• When alive: triggers a jump (increments jump count).
• On game over: resets game state and hides the overlay.
Collision & Game Over
•	Axis-aligned bounding box check between dino and each obstacle.
•	On collision: displays an overlay message and halts updates until reset.

Technologies
JavaScript
WebGL
HTML5
GLSL shaders
