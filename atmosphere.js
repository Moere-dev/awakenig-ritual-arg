// ============================================================
//  ATMOSPHERE ENGINE — Shared immersive effects
//  Configurable per page. Uses SFXCore.getCtx() — no leaked AudioContexts.
// ============================================================
var ATMO = (function() {
    'use strict';

    var droneOsc1, droneOsc2, droneGain;
    var crackleTimer, flickerTimer, tearTimer, interferenceTimer;
    var sCtx, sCanvas, sW, sH;
    var resizeTimeout;
    var cfg;
    var lastStaticTime = 0;

    // Defaults (index.html / aufzeichnung.html values)
    var DEFAULTS = {
        droneFreq1: 48,
        droneFreq2: 50.5,
        droneGain: 0.025,
        droneFadeIn: 4,
        lfoFreq: 0.15,
        lfoGain: 0.008,
        extraOscillators: null,       // array of {type, freq, gain, fadeIn} or null
        crackleDelay: [4000, 12000],  // [min, range]
        crackleDur: [0.04, 0.08],     // [min, range]
        crackleGain: [0.015, 0.015],  // [min, range]
        crackleBandpass: [2000, 4000], // [min, range]
        staticPixelChance: 0.10,
        staticAlpha: 12,
        flickerDelay: [6000, 15000],
        doubleFlickerChance: 0.3,
        doubleFlickerGap: 120,
        tearDelay: [10000, 20000],
        tearRemoval: [100, 100],
        interferenceDelay: [15000, 25000],
        interferenceHeight: [20, 60],
        interferenceRemoval: 150
    };

    // --- LOW DRONE (reuses SFXCore AudioContext) ---
    function startDrone() {
        var c = SFXCore.getCtx();
        droneGain = c.createGain();
        droneGain.gain.value = 0;
        droneGain.connect(c.destination);

        droneOsc1 = c.createOscillator();
        droneOsc1.type = 'sine';
        droneOsc1.frequency.value = cfg.droneFreq1;
        droneOsc1.connect(droneGain);
        droneOsc1.start();

        droneOsc2 = c.createOscillator();
        droneOsc2.type = 'sine';
        droneOsc2.frequency.value = cfg.droneFreq2;
        droneOsc2.connect(droneGain);
        droneOsc2.start();

        // Optional extra oscillators (e.g. sub-bass for terminal page)
        if (cfg.extraOscillators) {
            cfg.extraOscillators.forEach(function(osc) {
                var o = c.createOscillator();
                o.type = osc.type || 'sine';
                o.frequency.value = osc.freq;
                var g = c.createGain();
                g.gain.value = 0;
                o.connect(g);
                g.connect(c.destination);
                o.start();
                g.gain.linearRampToValueAtTime(osc.gain || 0.01, c.currentTime + (osc.fadeIn || 6));
            });
        }

        droneGain.gain.linearRampToValueAtTime(cfg.droneGain, c.currentTime + cfg.droneFadeIn);

        var lfo = c.createOscillator();
        var lfoGain = c.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = cfg.lfoFreq;
        lfoGain.gain.value = cfg.lfoGain;
        lfo.connect(lfoGain);
        lfoGain.connect(droneGain.gain);
        lfo.start();
    }

    // --- RANDOM CRACKLE (reuses SFXCore AudioContext) ---
    function scheduleCrackle() {
        var delay = cfg.crackleDelay[0] + Math.random() * cfg.crackleDelay[1];
        crackleTimer = setTimeout(function() {
            var c = SFXCore.getCtx();
            var rate = c.sampleRate;
            var dur = cfg.crackleDur[0] + Math.random() * cfg.crackleDur[1];
            var buf = c.createBuffer(1, rate * dur, rate);
            var data = buf.getChannelData(0);
            for (var i = 0; i < data.length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rate * dur * 0.2));
            }
            var src = c.createBufferSource();
            src.buffer = buf;
            var g = c.createGain();
            g.gain.value = cfg.crackleGain[0] + Math.random() * cfg.crackleGain[1];
            var bp = c.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = cfg.crackleBandpass[0] + Math.random() * cfg.crackleBandpass[1];
            bp.Q.value = 0.5;
            src.connect(bp);
            bp.connect(g);
            g.connect(c.destination);
            src.start();
            scheduleCrackle();
        }, delay);
    }

    // --- STATIC CANVAS (1/4 resolution, throttled to ~15fps) ---
    function initStatic() {
        sCanvas = document.getElementById('static-canvas');
        if (!sCanvas) return;
        sCtx = sCanvas.getContext('2d');
        function resize() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                var scale = 0.25;
                sW = Math.floor(window.innerWidth * scale);
                sH = Math.floor(window.innerHeight * scale);
                sCanvas.width = sW;
                sCanvas.height = sH;
            }, 150);
        }
        // Initial size (no debounce)
        var scale = 0.25;
        sW = Math.floor(window.innerWidth * scale);
        sH = Math.floor(window.innerHeight * scale);
        sCanvas.width = sW;
        sCanvas.height = sH;
        window.addEventListener('resize', resize);
        requestAnimationFrame(renderStatic);
    }

    function renderStatic(timestamp) {
        if (!sCtx) return;
        // Throttle to ~15fps
        if (timestamp - lastStaticTime < 66) {
            requestAnimationFrame(renderStatic);
            return;
        }
        lastStaticTime = timestamp;
        var imageData = sCtx.createImageData(sW, sH);
        var data = imageData.data;
        for (var i = 0; i < data.length; i += 4) {
            if (Math.random() < cfg.staticPixelChance) {
                var v = Math.random() * 255;
                data[i] = data[i + 1] = data[i + 2] = v;
                data[i + 3] = cfg.staticAlpha;
            }
        }
        sCtx.putImageData(imageData, 0, 0);
        requestAnimationFrame(renderStatic);
    }

    // --- SCREEN FLICKER ---
    function scheduleFlicker() {
        var delay = cfg.flickerDelay[0] + Math.random() * cfg.flickerDelay[1];
        flickerTimer = setTimeout(function() {
            document.body.classList.add('flickering');
            setTimeout(function() {
                document.body.classList.remove('flickering');
                if (Math.random() < cfg.doubleFlickerChance) {
                    setTimeout(function() {
                        document.body.classList.add('flickering');
                        setTimeout(function() {
                            document.body.classList.remove('flickering');
                        }, 80);
                    }, cfg.doubleFlickerGap);
                }
            }, 80);
            scheduleFlicker();
        }, delay);
    }

    // --- SCREEN TEAR ---
    function scheduleTear() {
        var delay = cfg.tearDelay[0] + Math.random() * cfg.tearDelay[1];
        tearTimer = setTimeout(function() {
            var tear = document.getElementById('screen-tear');
            if (tear) {
                tear.style.top = (Math.random() * 100) + '%';
                tear.classList.add('active');
                setTimeout(function() {
                    tear.classList.remove('active');
                }, cfg.tearRemoval[0] + Math.random() * cfg.tearRemoval[1]);
            }
            scheduleTear();
        }, delay);
    }

    // --- INTERFERENCE ---
    function scheduleInterference() {
        var delay = cfg.interferenceDelay[0] + Math.random() * cfg.interferenceDelay[1];
        interferenceTimer = setTimeout(function() {
            var band = document.getElementById('interference-band');
            if (band) {
                band.style.top = (Math.random() * 80 + 10) + '%';
                band.style.height = (cfg.interferenceHeight[0] + Math.random() * cfg.interferenceHeight[1]) + 'px';
                band.classList.add('active');
                setTimeout(function() {
                    band.classList.remove('active');
                }, cfg.interferenceRemoval);
            }
            scheduleInterference();
        }, delay);
    }

    return {
        init: function(userConfig) {
            cfg = {};
            // Merge defaults with user config
            for (var key in DEFAULTS) {
                cfg[key] = (userConfig && userConfig[key] !== undefined) ? userConfig[key] : DEFAULTS[key];
            }
            initStatic();
            scheduleFlicker();
            scheduleTear();
            scheduleInterference();
            // Drone starts on first user interaction (required by browsers)
            document.addEventListener('click', function startDroneOnce() {
                startDrone();
                scheduleCrackle();
                document.removeEventListener('click', startDroneOnce);
            }, { once: true });
        }
    };
})();
