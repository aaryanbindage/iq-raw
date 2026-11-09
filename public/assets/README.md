# Simulator brain illustration

`iq2-brain-simulator.png` is an AI-generated, transparent product illustration for the offline simulator, not a photograph of the user's hardware or an official VEX simulator. It was created with the built-in `image_gen` tool using the imagegen skill. No API/CLI fallback was used.

Physical reference: [VEX IQ2 product photo](https://www.vexrobotics.com/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/2/2/228-6480_iqrobotbraingen2_lqc_rev1.jpg). VEX branding belongs to its owner.

Prompt set:

1. Generate a photorealistic, orthographic top view of the referenced IQ2 brain on a transparent background, with detailed gray molded plastic, authentic device layout/branding, and an empty opaque black 160:108 LCD opening for a canvas overlay. Keep the screen horizontal and vertical with no perspective distortion, reflections or graphics. Include only the device, with soft studio lighting.
2. Correct only the arrow symbols: the upper-left button must point left (◀), and the lower-left button must point right (▶). Preserve device dimensions, positioning, screen opening, Check/X, materials, camera angle and transparency.
3. Clean up transparency only: remove floating white fragments outside the solid device silhouette, preserving the complete device, pixel alignment, left/right arrows, Check/X, branding, and opaque black LCD. No detached floating pixels.

Final edit prompt, verbatim:

> Clean up transparency ONLY. Preserve this exact device image, canvas dimensions, pixel alignment, black LCD rectangle, left/right arrow symbols, Check/X symbols, branding, all materials and the complete device silhouette. Remove the stray white fragments and floating speckles outside the device, especially along the top margin and outer corners. The entire area outside the solid device silhouette should be completely transparent with clean antialiased edges. No detached floating pixels. Do not change the product itself, its size or its position. Keep the LCD opaque black.

The final selected image is saved in this directory and used by `index.html`. Its canvas overlay uses CSS percentages calibrated against the final 1448 × 1086 image. The simulator's enlarged-screen mode shows its native 160 × 108 canvas independently of the illustration.
