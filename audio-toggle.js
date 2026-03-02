// ============================================================
//  AUDIO TOGGLE — Shared ambient audio setup & toggle
//  Handles autoplay, first-click fallback, error state.
// ============================================================
var AudioToggle = (function() {
    'use strict';

    return {
        init: function(audioId, btnId) {
            var audio = document.getElementById(audioId || 'ambient-audio');
            var btn = document.getElementById(btnId || 'audio-toggle');
            if (!audio || !btn) return;

            var playing = false;
            audio.volume = 1.0;

            function setPlaying() {
                playing = true;
                btn.textContent = 'SND:ON';
                btn.classList.remove('muted');
            }

            function setStopped() {
                playing = false;
                btn.textContent = 'SND:OFF';
                btn.classList.add('muted');
            }

            function tryPlay() {
                audio.play().then(setPlaying).catch(setStopped);
            }

            // Handle missing audio file gracefully
            audio.addEventListener('error', function() {
                btn.textContent = 'SND:N/A';
                btn.disabled = true;
                btn.classList.add('muted');
            });

            // Try autoplay
            tryPlay();

            // Fallback: play on first user click anywhere
            document.addEventListener('click', function firstClick() {
                if (!playing) tryPlay();
            }, { once: true });

            // Toggle button
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (playing) {
                    audio.pause();
                    setStopped();
                } else {
                    audio.play();
                    setPlaying();
                }
            });
        }
    };
})();
