# Relight

A Safelight extension for dodging and burning with light that follows the subject. Relight reads a height map and a normal map from the photo itself, and lights you place on the photo brighten the parts of the surface that face them, so the light falls across a face, a wall or a fold of cloth instead of as a flat gradient.

Everything happens on your graphics card, from the photo's own pixels. Nothing is uploaded and nothing is downloaded.

## How to use it

1. Open **Relight** in Develop.
2. Lower **Ambient** to deepen the shadows everywhere: 100 % keeps the photo's own light, 50 % is one stop darker.
3. Click **+ Add Light**. It appears a third of the way into the view. Drag it on the photo to where the light should come from; it can sit outside the frame, like a window out of shot.
4. Shape the light with its sliders: **Intensity**, **Height** (low lights rake across the surface, high ones light it from the front), **Falloff** (how quickly it fades with distance; the dashed ring is where it halves) and its colour: **Hue** picks it and **Saturation** sets how strongly it is coloured, from white at 0.

5. Click **Done** or press **Esc** when the lights are placed: their handles and the falloff ring leave the photo. **Edit Lights**, or choosing a light in the list, brings them back.

Up to four lights. Select one in the list or on the photo; Delete removes the selected handle.

### The surface

Brighter parts of the photo are read as nearer, darker parts as further away.

- **Depth**: how steep the surface is, and so how strongly the light picks out its shape.
- **Detail**: low values keep to broad forms; high values add fine texture.
- **Invert**: darker is nearer, for subjects where the shadows are the raised parts.
- **Photo / Normals / Height** shows the surface the light acts on, in place of the photo. Only the view changes; nothing is saved.

### In a mask

Add **Relight** to a mask in the Masking panel to light only part of the photo. A mask has its own **Ambient** and its own lights; while its Relight section shows, the lights on the photo are the mask's, and you place and drag them as usual. The surface is the photo's: Depth, Detail and Invert are set in the Relight panel, and every mask follows them when you change them there. A mask pasted from another photo keeps the surface it came with until you do.

## Things to know

- Relight is an exposure change in linear light, in the scene-linear phase, before the display transform. It clips nothing itself: a lit highlight above white is handed on whole, and the display transform renders it as it renders any bright value. Export matches what you see.
- The surface is read from the decoded photo, before your edits, so Exposure, White Balance and the other tools don't change where the light falls. Moving a light redraws only the shading, not the surface.
- The relief comes from brightness, not from a 3D model of the scene. A dark object on a light background reads as a hollow and a bright pattern as a bump. Detail and Invert help; for photos where that guess is wrong, keep Depth low and use the lights as soft, shaped dodges.
- Lights shade the surface but don't cast shadows.
- While the photo has lights of its own, a mask on the photo's surface adds only its own shading, and a mask set like the photo adds nothing. While the photo itself has no light, each lit mask reads the surface for itself, at the cost of a surface per mask, and so does a mask on another surface. Masks need Safelight 3.2.4.
- At Ambient 100 % with no light, Relight costs nothing: the renderer leaves it out.

## Licence

GPL-3.0-or-later. See `LICENSE`.
