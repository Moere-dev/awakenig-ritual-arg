// ============================================================
//  SFX CORE — Shared Audio Engine (Web Audio API)
//  Single AudioContext, reused across all sound effects.
// ============================================================
var SFXCore = (function() {
    'use strict';
    var ctx, _lastClick = 0;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function tone(type, freq, dur, vol) {
        var c = getCtx(), o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.08, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.connect(g);
        g.connect(c.destination);
        o.start();
        o.stop(c.currentTime + dur);
    }

    function noise(dur, vol, highpass) {
        var c = getCtx(), rate = c.sampleRate;
        var buf = c.createBuffer(1, rate * dur, rate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < data.length; i++)
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rate * dur * 0.3));
        var src = c.createBufferSource();
        src.buffer = buf;
        var g = c.createGain();
        g.gain.value = vol;
        if (highpass) {
            var f = c.createBiquadFilter();
            f.type = 'highpass';
            f.frequency.value = highpass;
            src.connect(f);
            f.connect(g);
        } else {
            src.connect(g);
        }
        g.connect(c.destination);
        src.start();
    }

    return {
        getCtx: getCtx,
        tone: tone,
        noise: noise,

        // Common sounds used across multiple pages
        typeClick: function() {
            var now = Date.now();
            if (now - _lastClick < 8) return;
            _lastClick = now;
            noise(0.012, 0.04 + Math.random() * 0.04, 3000 + Math.random() * 2000);
        },
        keyPress: function() {
            noise(0.012, 0.04, 4000);
        }
    };
})();
