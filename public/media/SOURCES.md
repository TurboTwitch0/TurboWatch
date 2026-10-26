# Demo media credits

All TurboWatch seed accounts, captions, comments, boards, counts, and messages are fictional demonstration content. They do not identify or imply ownership by the people pictured in third-party photographs. Avatars are original SVG initials created for this demo.

Media is bundled locally so the application works without third-party image requests.

## GLightbox demonstration photography and video

Source repository: <https://github.com/biati-digital/glightbox>, commit `a9385e50828b90e65bfc146a7c7e196081ba1a0d`.

The upstream demonstration page credits its photographs to [Unsplash](https://unsplash.com) and its video to [Pexels: A rocky coast](https://www.pexels.com/video/a-rocky-coast-1550080/). The GLightbox project is MIT licensed; its license is retained in `GLIGHTBOX-LICENSE.md`. Photographs and video remain subject to their respective [Unsplash](https://unsplash.com/license) and [Pexels](https://www.pexels.com/license/) licenses.

| Local file | Upstream file |
| --- | --- |
| studio.jpg | demo/img/large/gm3.jpg |
| honey.jpg | demo/img/large/gm2.jpg |
| portrait.jpg | demo/img/large/gm1.jpg |
| vintage.jpg | demo/img/large/gm6.jpg |
| picnic.jpg | demo/img/large/gm9.jpg |
| cat.jpg | demo/img/large/gm8.jpg |
| room.jpg | demo/img/large/gm5.jpg |
| coast.mp4 | demo/pexels-video-1550080.mp4 |
| coast.jpg | A single poster frame extracted from coast.mp4 at 3 seconds |

## LightGallery demonstration photography

Source repository: <https://github.com/sachinchoolur/lightGallery>, commit `5df861997336d12e2f1960e102b633c1b330476d`. All listed files are demonstration photographs from `site/static/images/demo/`, credited in the upstream gallery to Unsplash. The photographs are used under the [Unsplash license](https://unsplash.com/license); no LightGallery application code is included in TurboWatch.

| Local file | Upstream file |
| --- | --- |
| mountains.jpg | image-1.jpg |
| night.jpg | image-3.jpg |
| mist.jpg | image-4.jpg |
| summit.jpg | image-9.jpg |

`mountain-story.mp4` is a twelve-second photo slideshow assembled locally from mountains.jpg, mist.jpg, and summit.jpg. It has no audio and does not represent live footage.

Before replacing demonstration media with user submissions, retain the submitter's attribution and rights information.

## Typography

`manrope.ttf` is the Manrope variable font (weights 200–800) from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/manrope). Copyright 2019 The Manrope Project Authors. Licensed under the SIL Open Font License 1.1, retained in `MANROPE-OFL.txt`.

## Additional demonstration photography

The following Start Bootstrap sample photographs are bundled unchanged from the MIT-licensed source distributions. The original license notice is retained in `STARTBOOTSTRAP-LICENSE.txt`. These are demonstration illustrations and do not imply endorsement by the photographers, people, or brands pictured.

| Local file | Source repository / upstream file |
| --- | --- |
| creative-table.jpg | [StartBootstrap/startbootstrap-creative](https://github.com/StartBootstrap/startbootstrap-creative), commit `b1762d8c690a2379c078c776dc0830bdd81c6f55`, `src/assets/img/portfolio/fullsize/1.jpg` |
| type-study.jpg | Same Creative commit, `src/assets/img/portfolio/fullsize/2.jpg` |
| film-cameras.jpg | Same Creative commit, `src/assets/img/portfolio/fullsize/3.jpg` |
| kitchen-prep.jpg | Same Creative commit, `src/assets/img/portfolio/fullsize/4.jpg` |
| makers-desk.jpg | Same Creative commit, `src/assets/img/portfolio/fullsize/5.jpg` |
| guitar-shop.jpg | [StartBootstrap/startbootstrap-one-page-wonder](https://github.com/StartBootstrap/startbootstrap-one-page-wonder), commit `4a2712c4601d9f5209e97e2b4229d39d55beca84`, `src/assets/img/01.jpg` |
| live-stage.jpg | Same One Page Wonder commit, `src/assets/img/02.jpg` |
| after-hours.jpg | Same One Page Wonder commit, `src/assets/img/03.jpg` |

These additional landscape and wildlife photographs come from the LightGallery demonstration-media source listed above, at the same pinned commit, and remain subject to the Unsplash license:

| Local file | Upstream file in `site/static/images/demo/` |
| --- | --- |
| desert.jpg | image-2.jpg |
| wildlife.jpg | image-5.jpg |
| quiet-water.jpg | image-6.jpg |
| songbird.jpg | image-7.jpg |
| arctic.jpg | image-8.jpg |
| lake-sunset.jpg | 1-1600.jpg |

## Additional short videos

All ten additional clips are genuinely distinct moving-video sources. `clip-manifest.json` records their actual duration, dimensions, content summary, and SHA-256 checksum. Each `.jpg` poster with the same name was extracted from its corresponding final clip. Clips were trimmed where noted, scaled without stretching, encoded as H.264 with AAC audio when the source includes audio, and optimized for progressive playback. No loops, generated motion, or duplicate-source substitutions were used to inflate the clip count.

### MDN demonstration media

Source: [mdn/interactive-examples](https://github.com/mdn/interactive-examples), commit `13024db581b08fae11a0ca229497198b9b0534e7`. Upstream uses [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/); its text is retained in `MDN-CC0-LICENSE.txt`.

| Local clip | Upstream path | Changes |
| --- | --- | --- |
| clip-flower.mp4 | live-examples/media/cc0-videos/flower.mp4 | Center-cropped to portrait and transcoded; full 5.055 seconds |
| clip-cinema.mp4 | live-examples/media/cc0-videos/friday.mp4 | Public-domain *His Girl Friday* excerpt; full 6.166 seconds, transcoded |
| clip-stream.mp4 | live-examples/media/examples/stream-of-water.mp4 | Full 3.157-second stream clip, transcoded |

Source: [mdn/learning-area](https://github.com/mdn/learning-area), commit `21973263ba859ff3477919087b488157f9d618a6`. The repository's CC0 license applies to the following instructional samples:

| Local clip | Upstream path | Changes |
| --- | --- | --- |
| clip-rabbit.mp4 | html/multimedia-and-embedding/video-and-audio-content/rabbit320.mp4 | Full 7.8-second rabbit sample, transcoded |
| clip-toy-frog.mp4 | javascript/apis/client-side-storage/indexeddb/video-store/videos/frog.mp4 | Full 8.266-second wind-up frog toy sample, transcoded |
| clip-toy-pig.mp4 | javascript/apis/client-side-storage/indexeddb/video-store/videos/pig.mp4 | Full 6.533-second wind-up pig toy sample, transcoded |

### ImageIO public-domain sample

`clip-cockatoo.mp4` comes from [imageio/imageio-binaries](https://github.com/imageio/imageio-binaries), commit `f8f64710ea88e7e4a352c0f7d8c0deac9f5fd685`, `images/cockatoo.mp4`. ImageIO's [standard-images documentation](https://github.com/imageio/imageio/blob/803b9ef192e393174d885000842aa7b1199ad608/docs/user_guide/standardimages.rst) states that its listed standard sample media are, to the best of its knowledge, in the public domain. The full fourteen-second sample was center-cropped to portrait, scaled, and transcoded; audio was converted from MP3 to AAC.

### Sintel open movie

`clip-sintel.mp4` is an excerpt from **Sintel © 2010 Blender Foundation**, [studio.blender.org/films/sintel](https://studio.blender.org/films/sintel/), licensed under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). Source copy: the MDN Learning Area commit above, `javascript/apis/video-audio/finished/video/sintel-short.mp4`, whose accompanying page retains the Blender Foundation credit. Changes: excerpted source seconds 80–92, transcoded and scaled; the original aspect ratio is preserved. The fictional demo account displaying this excerpt is curating open animation, not claiming authorship.

### Intel sample videos

Creator/source: [Intel IoT DevKit sample-videos](https://github.com/intel-iot-devkit/sample-videos), commit `57978890822836f2b4743852f04f62fc511757e4`. Licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The complete upstream license, including its disclaimer of warranties, is retained in `INTEL-CCBY4-LICENSE.txt`. No Intel sponsorship or endorsement is implied.

| Local clip | Upstream file | Changes |
| --- | --- | --- |
| clip-produce.mp4 | fruit-and-vegetable-detection.mp4 | Excerpted seconds 5–17; scaled to 720-pixel width and transcoded |
| clip-city.mp4 | person-bicycle-car-detection.mp4 | Excerpted seconds 40–52; scaled to 720-pixel width and transcoded |

The produce clip shows fruit and vegetables on a demonstration conveyor; the city clip shows pedestrians, a cyclist, and a car in a demonstration parking area. Captions should describe these actual subjects and avoid presenting them as personal or live footage.
