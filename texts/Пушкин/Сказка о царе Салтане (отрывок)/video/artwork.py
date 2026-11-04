"""Original vector artwork for Pushkin's sea adventure, drawn without assets.

Public API: scene_svg(0..8) -> a standalone 1920 x 760 SVG.
Animation hooks are on untransformed inner groups. Positioning lives on
their parent groups, so an animator can move a sail/arm/ship independently.
"""

from math import sin, cos, pi

INK = "#173747"
CREAM = "#fff3d2"
CORAL = "#ed795a"
GOLD = "#efbd4c"
TEAL = "#159eaa"


def _g(body, x=0, y=0, scale=1, rotate=0, cls=""):
    inner = f'<g class="{cls}">{body}</g>' if cls else body
    return f'<g transform="translate({x} {y}) rotate({rotate}) scale({scale})">{inner}</g>'


def _path(d, fill="none", stroke=INK, sw=4, **attrs):
    extra = " ".join(f'{key.replace("_", "-")}="{val}"' for key, val in attrs.items())
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def _ellipse(x, y, rx, ry, fill, stroke=INK, sw=4, **attrs):
    extra = " ".join(f'{key.replace("_", "-")}="{val}"' for key, val in attrs.items())
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def _defs(p):
    return f'''<defs>
      <linearGradient id="{p}sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a7e1e4"/><stop offset="1" stop-color="#f9efd0"/></linearGradient>
      <linearGradient id="{p}water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#69ccd0"/><stop offset=".55" stop-color="#27b4be"/><stop offset="1" stop-color="#087f95"/></linearGradient>
      <linearGradient id="{p}sail" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#fff9df"/><stop offset=".58" stop-color="#f6e8b9"/><stop offset="1" stop-color="#d6bf85"/></linearGradient>
      <linearGradient id="{p}wood" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d99558"/><stop offset="1" stop-color="#955434"/></linearGradient>
      <linearGradient id="{p}gold" x1="0" y1="0" x2="1" y2=".25"><stop stop-color="#f8d56b"/><stop offset=".35" stop-color="#fff0a1"/><stop offset=".6" stop-color="#edb13c"/><stop offset="1" stop-color="#bd7b28"/></linearGradient>
      <linearGradient id="{p}wall" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#fff4d1"/><stop offset="1" stop-color="#e8c88a"/></linearGradient>
      <linearGradient id="{p}coat" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#2e8094"/><stop offset="1" stop-color="#17546c"/></linearGradient>
      <linearGradient id="{p}parchment" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2ca"/><stop offset="1" stop-color="#e7c88e"/></linearGradient>
    </defs>'''


def _cloud(x, y, scale=1):
    d = "M-102 20 C-128 14-129-17-103-23 C-112-56-69-71-47-49 C-35-91 25-90 41-51 C70-68 103-42 95-16 C136-13 137 24 107 26 Z"
    return _g(_path(d, CREAM, "#a8d2cb", 2.5) + _path("M-94 9 Q-45 1-15 9 M47 12 Q77 8 103 13", stroke="#e9dfbd", sw=3), x, y, scale, cls="art-cloud")


def _bird(x, y, scale=1, rotate=0):
    return _g(_path("M-22 6 Q-10-10 0 0 Q13-15 28-6", stroke=INK, sw=4), x, y, scale, rotate, "art-bird")


def _background(p, title=False, sunset=False):
    sunx = 1700 if title else 1540
    suny = 220 if title else 202
    body = f'<rect width="1920" height="760" fill="url(#{p}sky)"/>'
    body += _ellipse(sunx, suny, 111, 111, "#ffedb7", "none", 0, opacity=".5")
    body += _ellipse(sunx, suny, 77, 77, "#ffe7a0", "none", 0)
    body += f'<path d="M0 482 Q280 458 510 480 T1000 481 T1500 477 T1920 474 V760 H0Z" fill="url(#{p}water)"/>'
    body += _path("M0 485Q220 464 450 483T900 481T1380 479T1920 477", stroke="#368f9d", sw=3)
    if title:
        body += _cloud(195, 195, .72) + _cloud(1745, 373, .7)
        body += _bird(237, 330, 1.1, -8) + _bird(1690, 115, .9, 10)
    else:
        body += _cloud(300, 185, .85) + _cloud(1320, 173, .9) + _cloud(1690, 365, .6)
        body += _bird(1120, 256, 1.1, -8) + _bird(1180, 294, .7, 8) + _bird(1610, 120, .8)
    for x, y, w in [(190, 529, 95), (560, 503, 128), (1160, 523, 91), (1570, 508, 117), (960, 565, 66), (1740, 560, 56)]:
        body += _path(f"M{x} {y}q{w/2}-7 {w} 0", stroke="#c4eee0", sw=5)
    return body


def _waves(y=620, front=False, calmer=False):
    if calmer:
        d = f"M-90 {y+40} Q90 {y-4} 210 {y+20} T530 {y+15} T850 {y+21} T1170 {y+13} T1480 {y+26} T1800 {y+17} T2080 {y+20} V820 H-90Z"
        return _g(_path(d, "#148fa3" if front else "#46bfc6", "#0e748a", 3) + _path(f"M0 {y+37} Q170 {y+5} 320 {y+34} T650 {y+25} T980 {y+29} T1310 {y+28} T1640 {y+34} T1960 {y+23}", stroke="#e5efd7", sw=8), cls="art-waves-front" if front else "art-waves-back")
    body = ""
    for j, x in enumerate(range(-220, 2150, 330)):
        yy = y + (j % 3) * 13
        body += _path(f"M{x-160} {yy+105} C{x-72} {yy+118} {x-26} {yy+6} {x+59} {yy-7} C{x+113} {yy-16} {x+144} {yy+26} {x+103} {yy+49} C{x+117} {yy+19} {x+82} {yy+15} {x+66} {yy+35} C{x+25} {yy+91} {x+153} {yy+125} {x+230} {yy+75} L{x+230} 820 H{x-160}Z", "#0b91a6" if front else "#42bbc3", "none", 0)
        body += _path(f"M{x-131} {yy+96} C{x-36} {yy+89} {x-22} {yy+2} {x+56} {yy-4} C{x+94} {yy-9} {x+122} {yy+13} {x+110} {yy+31}", stroke=CREAM, sw=11)
        body += _path(f"M{x-53} {yy+109} Q{x+5} {yy+97} {x+30} {yy+67} M{x+77} {yy+83}Q{x+117} {yy+108} {x+173} {yy+94}", stroke="#78d6d2", sw=4)
    return _g(body, cls="art-waves-front" if front else "art-waves-back")


def _ship(p, x, y, scale=1, rotate=-3, little=False):
    """A recognisable wooden merchant ship: mast, belly sail, rigging, boards."""
    body = _path("M-389-48 L-405-102 L-344-95 L-304-63 L260-66 Q335-83 404-125 L362-26 Q330 54 230 70 L-236 70 Q-334 46-389-48Z", f"url(#{p}wood)", INK, 7)
    # Hull strakes follow the boat's curve, rather than arbitrary vertical stripes.
    body += _path("M-370-20 Q-92 38 350-27 M-342 10 Q-80 71 329 8 M-298 41Q-65 90 279 40", stroke="#6d4932", sw=4)
    body += _path("M-384-54Q-69 5 377-58", stroke="#f1c77a", sw=12)
    body += _path("M-383-60Q-74-5 379-64", stroke=INK, sw=4)
    for xx, yy in [(-264, 9), (-170, 25), (-64, 30), (48, 29), (160, 20), (269, 0)]:
        body += _ellipse(xx, yy, 11, 9, "#173c49", "#e2b775", 3)
    # Deck rail and aft cabin.
    body += _path("M-318-98 L-287-172 L-173-161 L-159-78Z", "#dca26a", INK, 5)
    body += _path("M-302-163 L-275-187 L-161-175 L-175-151Z", CORAL, INK, 4)
    body += _path("M-268-144L-236-141L-238-105L-272-108Z", "#356b76", INK, 4)
    body += _path("M-211-136L-186-133L-185-99L-214-101Z", "#356b76", INK, 4)
    body += _path("M-253-142L-255-107 M-198-135V-100", stroke="#e8d49e", sw=3)
    body += _path("M-339-103 Q-50-47 371-105 M-332-126Q-65-70 375-128", stroke=INK, sw=6)
    for xx in [-319, -259, -199, -139, -79, -19, 41, 101, 161, 221, 281, 341]:
        yy = -103 + 31 * (1 - (abs(xx) / 390) ** 1.5)
        body += _path(f"M{xx} {yy}v-25", stroke=INK, sw=5)
    # Bow, rudder, rigging and main mast.
    body += _path("M318-103L452-184 M-386-43L-418 25L-402 34L-365-16", stroke=INK, sw=8)
    body += _path("M13-422L14-58", stroke=INK, sw=15)
    body += _path("M11-418L12-72", stroke="#c99458", sw=7)
    body += _path("M-183-327L243-331 M-151-104L280-116", stroke=INK, sw=9)
    body += _path("M15-402L-324-98 M15-402L363-102 M-180-326L-288-87 M242-331L332-101", stroke="#50675e", sw=3)
    # Full, luminous sail, with hand-stitched seams and compass rose emblem.
    sail = _path("M-177-326 Q23-380 243-329 Q333-217 276-115 Q43-67-151-105 Q-106-207-177-326Z", f"url(#{p}sail)", INK, 5)
    sail += _path("M-166-315Q32-358 231-318 M-138-118Q65-81 267-126", stroke="#b9a172", sw=3)
    sail += _path("M-97-332Q-29-230-73-99 M-10-342Q76-220 30-92 M88-341Q169-229 132-95 M179-335Q260-220 228-107", stroke="#d1bd87", sw=2.5)
    # Not a flag or copied cartoon device: an original sea compass mark.
    sail += _path("M80-296L94-244L142-232L95-218L81-164L67-217L19-231L66-245Z", "#e7795a", "#bd694a", 3)
    sail += _ellipse(81, -231, 18, 18, "#fae8b0", "#bd694a", 3)
    sail += _path("M81-277V-185M41-232H121", stroke="#c47e4c", sw=2)
    body += _g(sail, cls="art-sail")
    # Small triangular mizzen and pennant.
    body += _path("M-199-313L-202-167L-332-166Q-302-245-199-313Z", CREAM, INK, 4)
    body += _path("M-202-310L-204-114", stroke=INK, sw=7)
    body += _path("M18-421Q68-447 127-414L80-390Q51-414 18-398Z", CORAL, INK, 4)
    body += _path("M-10-371Q17-360 43-371L38-346Q13-335-7-346Z", "#9b6242", INK, 4)
    # Rope ladder and recognisable rope coil at the bow.
    body += _path("M-63-74L4-337 M-27-70L23-336", stroke="#736a51", sw=3)
    for yy in range(-313, -90, 23):
        t = (-yy - 70) / 267
        body += _path(f"M{-63+67*t} {yy}L{-27+50*t} {yy+3}", stroke="#736a51", sw=3)
    body += _ellipse(295, -95, 26, 9, "none", "#e9d495", 4)
    body += _ellipse(295, -100, 20, 7, "none", "#e9d495", 4)
    # Bow scroll, an anchor, and fine wave reflections.
    body += _path("M351-49Q373-68 379-49T357-18 M-290-62V-14M-315-30Q-292 2-268-30M-302-51H-278", stroke=INK, sw=4)
    return _g(body, x, y, scale, rotate, "art-ship")


def _dome(p, x, y, width, height, color=None):
    w = width / 2
    stem = _path(f"M{-w*.78} 2V{height*.69}H{w*.78}V2Z", f"url(#{p}wall)", INK, 4)
    stem += _path(f"M{-w*.89} 8H{w*.89}V25H{-w*.89}Z", "#dfad58", INK, 3)
    # Onion profile: shoulders, pinched neck, and a crisp golden point.
    stem += _path(f"M{-w} 0 C{-w*1.16} {-height*.3} {-w*.25} {-height*.41} 0 {-height*.77} C{w*.25} {-height*.41} {w*1.16} {-height*.3} {w} 0Z", color or f"url(#{p}gold)", INK, 4)
    stem += _path(f"M0 {-height*.72}Q{-w*.48} {-height*.18} {-w*.37} -2 M0 {-height*.72}Q{w*.48} {-height*.18} {w*.37} -2", stroke="#ba8a33", sw=2.5)
    stem += _path(f"M0 {-height*.79}V{-height*.96} M{-w*.13} {-height*.89}H{w*.13}", stroke=INK, sw=3)
    stem += _ellipse(0, -height*.98, 4.3, 4.3, GOLD, INK, 2)
    for xx in [-w*.4, w*.4]:
        stem += _path(f"M{xx-9} {height*.47}V{height*.27}Q{xx} {height*.13} {xx+9} {height*.27}V{height*.47}Z", "#387a88", INK, 2.5)
    return _g(stem, x, y)


def _city(p, x, y, scale=1, island=True):
    body = ""
    if island:
        body += _path("M-477 31Q-389-43-261-29Q-143-99 5-55Q138-110 274-45Q411-46 473 42Q315 100 59 87Q-274 104-477 31Z", "#6eb18d", INK, 5)
        body += _path("M-477 31Q-213 82 57 66Q324 76 473 42L423 88Q127 132-185 106Q-402 96-477 31Z", "#d0bc7b", INK, 4)
        body += _path("M-396 38Q-265 15-202 37M238 28Q330 10 396 40", stroke="#c1d58b", sw=7)
    # Clusters of houses make the scale of the city readable.
    for xx, yy, ww, hh in [(-353, -68, 86, 133), (-267, -118, 112, 146), (-120, -104, 95, 177), (28, -126, 95, 174), (166, -82, 103, 150), (279, -72, 94, 123)]:
        body += _path(f"M{xx-ww/2} 10V{yy-hh*.22}H{xx+ww/2}V10Z", f"url(#{p}wall)", INK, 3.5)
        body += _path(f"M{xx-ww*.61} {yy-hh*.2}L{xx} {yy-hh*.57}L{xx+ww*.61} {yy-hh*.2}Z", "#d68157", INK, 3.5)
        for dx in [-ww*.23, ww*.23]:
            body += _path(f"M{xx+dx-7} {yy+34}v-31q7-14 14 0v31Z", "#598b8e", INK, 2)
    body += _dome(p, -226, -192, 100, 114)
    body += _dome(p, -100, -269, 111, 139)
    body += _dome(p, 39, -224, 139, 157)
    body += _dome(p, 190, -177, 94, 106)
    body += _dome(p, 302, -152, 71, 85)
    # Port bastions, crenellations and an open dark arch.
    body += _path("M-413-68H413V58H-413Z", f"url(#{p}wall)", INK, 5)
    for xx in range(-407, 404, 39):
        body += _path(f"M{xx} -65V-88H{xx+22}V-65Z", "#eed09b", INK, 3)
    body += _path("M-118 57V-103Q0-211 118-103V57Z", "#f9deb0", INK, 5)
    body += _path("M-68 58V-86Q0-145 68-86V58Z", "#326a72", INK, 5)
    body += _path("M-67 58V-84Q-46-108-32-110V55Z M68 58V-84Q46-108 32-110V55Z", "#a76b43", INK, 3)
    body += _path("M-52-67V38 M52-67V38", stroke="#d6a66b", sw=3)
    body += _path("M-122-104H122L93-132H-93Z", CORAL, INK, 4)
    body += _ellipse(0, -99, 11, 11, GOLD, INK, 3)
    for xx in [-380, 380]:
        body += _path(f"M{xx-37} 57V-143H{xx+37}V57Z", "#e9c591", INK, 4)
        body += _path(f"M{xx-46} -143L{xx} -206L{xx+46} -143Z", CORAL, INK, 4)
        body += _path(f"M{xx-12} -54V-91Q{xx} -110 {xx+12}-91V-54Z", "#417b83", INK, 3)
        body += _path(f"M{xx} -205V-244L{xx+51}-227L{xx}-217", CORAL, INK, 3)
    # Stone joints, spaced sparsely to retain a clean, cinematic silhouette.
    for yy in [-32, 10, 43]:
        for xx in [-321, -242, -160, 156, 236, 315]:
            body += _path(f"M{xx-23} {yy}h46m-23 0v-18", stroke="#cba977", sw=2)
    return _g(body, x, y, scale, cls="art-city")


def _hand(x, y, scale=1, rotate=0, skin="#efb987", pointing=False):
    if pointing:
        d = "M-20 14L-22-8Q-23-19-16-20L-5-14L26-28Q42-32 42-24L12-7L29-10Q39-6 31 1L17 8Q26 19 13 25L-6 28Z"
        lines = "M2-8L12-7 M2 3L17 8 M-4 13L12 18"
    else:
        d = "M-20 17L-29-4Q-34-15-26-18Q-20-19-13-7L-14-36Q-12-47-5-40L0-17L1-48Q5-57 11-47L13-18L19-43Q25-49 28-39L24-11L32-30Q40-35 41-25L34 5Q29 23 10 29L-7 31Z"
        lines = "M-13-7L-8 10 M0-17L2 2 M13-18L13-1 M24-11L22 2 M-5 20Q8 11 23 15"
    return _g(_path(d, skin, INK, 3) + _path(lines, stroke="#bc805d", sw=2), x, y, scale, rotate)


def _person(p, x, y, scale=1, variant=0, hero=False, emotion="smile", pose="rest", flip=False):
    skin = ["#edb383", "#eac09b", "#dca175"][variant % 3]
    hair = ["#76482e", "#584a43", "#8a5033"][variant % 3] if not hero else "#3d3c36"
    coat = ["#d46e50", "#397d86", "#a07b46"][variant % 3]
    trim = "#f1d08b"
    b = ""
    if hero:
        b += _path("M-77-212Q-123-193-144-87L-158 7L-73-24L101 4Q126-104 76-215Z", "#d87557", INK, 5)
        b += _path("M-124-109L-136-1 M109-91L94-8", stroke="#b04f40", sw=4)
    # Feet and richly seamed tunic.
    b += _path("M-64-29L-68 5L-93 17Q-103 32-69 31L-33 26L-27-25 M28-24L34 25L68 31Q100 34 86 17L66 7L63-27", "#70503b", INK, 4)
    b += _path("M-65-211Q-100-205-111-158L-88-29Q0-3 89-29L108-153Q100-203 63-211Z", f"url(#{p}coat)" if hero else coat, INK, 5)
    # Arms are actual curved sleeves, attached at the shoulder.
    left = _path("M-77-205Q-115-199-129-148L-153-82Q-143-64-121-69L-75-135Z", f"url(#{p}coat)" if hero else coat, INK, 4)
    left += _path("M-152-91L-124-80L-130-63L-157-73Z", trim, INK, 3)
    left += _hand(-141, -54, .66, 166, skin)
    b += _g(left, cls="art-arm")
    if pose in ("invite", "question"):
        right = _path("M75-206Q106-205 118-166L153-157L204-178L216-147L159-116Q137-109 115-120L74-151Z", f"url(#{p}coat)" if hero else coat, INK, 4)
        right += _path("M194-180L217-185L228-151L207-143Z", trim, INK, 3)
        right += _hand(235, -171, .8, 67, skin)
        right += _path("M106-171Q99-154 107-140M166-151L186-160", stroke="#173747", sw=2.5)
    elif pose == "point":
        right = _path("M72-205Q115-210 132-175L189-206L205-177L137-137Q115-132 88-152Z", coat, INK, 4)
        right += _path("M180-208L201-220L216-184L197-174Z", trim, INK, 3)
        right += _hand(222, -211, .95, -13, skin, True)
    elif pose == "wonder":
        right = _path("M74-205Q111-207 126-171L118-119Q100-108 85-123L77-165L62-185Z", coat, INK, 4)
        right += _path("M90-137L119-141L122-119L92-116Z", trim, INK, 3)
        right += _hand(101, -159, .76, -17, skin)
    else:
        right = _path("M77-205Q118-193 127-149L139-78Q127-63 108-77L79-136Z", f"url(#{p}coat)" if hero else coat, INK, 4)
        right += _path("M111-95L139-101L144-78L116-72Z", trim, INK, 3)
        right += _hand(132, -58, .66, 177, skin)
    b += _g(right, cls="art-arm")
    # Collar, belt and clothes: readable cloth folds and small embroidery.
    b += _path("M-57-207L-30-220L0-174L30-220L58-208L39-162L0-174L-38-161Z", trim, INK, 3)
    b += _path("M0-173V-33 M-50-150L-59-99M49-148L59-106 M-50-70L-58-35M47-69L56-36", stroke="#214750", sw=3)
    b += _path("M-92-94Q0-77 93-94L91-75Q0-57-91-75Z", "#6e4e35", INK, 3)
    b += _path("M-14-92H15V-70H-14Z", GOLD, INK, 3)
    for yy in [-152, -130, -109]:
        b += _ellipse(12, yy, 4, 4, GOLD, INK, 1.5)
    if hero:
        for xx in [-63, 63]:
            for yy in [-151, -126, -46]:
                b += _path(f"M{xx} {yy-8}l6 8-6 8-6-8Z", GOLD, "none", 0)
        b += _ellipse(-68, -201, 13, 13, GOLD, INK, 3)
    # Neck and hair silhouette. Face has irregular cheeks rather than a disc.
    b += _path("M-23-231L-26-205Q0-184 27-205L23-234Z", skin, INK, 3)
    b += _path("M-61-268Q-79-320-47-340Q-18-363 16-348Q65-352 70-307L60-243L-53-240Z", hair, INK, 4)
    b += _ellipse(-60, -270, 12, 18, skin, INK, 3)
    b += _ellipse(61, -270, 12, 18, skin, INK, 3)
    b += _path("M-56-306Q-47-332-15-322Q10-309 47-318Q66-294 56-258Q51-223 22-212Q-14-204-40-230Q-59-251-56-306Z", skin, INK, 4)
    b += _path("M-61-306Q-69-336-40-344Q-11-361 15-341Q44-350 64-322L54-302Q34-306 21-323Q0-300-29-311L-44-291Z", hair, INK, 3)
    b += _path("M-48-271Q-56-280-61-269M53-271Q60-280 63-268", stroke="#bc805d", sw=2)
    # White eyes, directed pupils, eyebrows and warm cheeks.
    for xx in [-25, 28]:
        b += _ellipse(xx, -279, 14, 12 if emotion != "wonder" else 16, "#fff7dc", INK, 2.5)
        pupil_x = xx + (4 if hero else -1)
        b += _ellipse(pupil_x, -278, 5.5, 7.5, INK, "none", 0)
        b += _ellipse(pupil_x+1.5, -281, 1.8, 2.1, CREAM, "none", 0)
    if emotion == "wonder":
        b += _path("M-42-305Q-24-319-10-307M13-309Q30-320 44-303", stroke=hair, sw=7)
    elif hero:
        b += _path("M-42-300Q-24-308-10-299M15-301Q31-309 45-303", stroke=hair, sw=7)
    else:
        b += _path("M-42-299Q-26-309-10-300M13-300Q31-307 45-297", stroke=hair, sw=7)
    b += _path("M3-280L-5-256Q1-249 14-255", stroke="#a96548", sw=3)
    b += _ellipse(-37, -253, 11, 5, "#df8b70", "none", 0, opacity=".65")
    b += _ellipse(40, -251, 10, 5, "#df8b70", "none", 0, opacity=".65")
    if hero:
        # Young Gvidon: clean jaw, just a soft moustache and heroic side locks.
        b += _path("M-11-240Q0-250 12-241Q23-245 30-236Q12-229 3-237Q-6-232-19-235Z", hair, "none", 0)
        if emotion == "question":
            b += _path("M-11-223Q4-234 19-225Q13-212 0-215Z", "#713f38", INK, 2)
        else:
            b += _path("M-15-226Q3-217 22-228", stroke="#9a543e", sw=3)
        b += _path("M-61-293L-56-251L-43-242L-43-275M56-294L61-258L47-244L46-275", hair, INK, 2)
        # A broad gold princely crown with jewels, resting naturally on his hair.
        b += _path("M-59-331L-64-368L-35-351L-18-382L4-355L29-382L43-350L70-367L60-330Z", f"url(#{p}gold)", INK, 4)
        b += _path("M-58-340Q3-332 61-340L60-327Q1-319-58-329Z", GOLD, INK, 3)
        for xx, yy in [(-40, -339), (3, -335), (42, -339)]:
            b += _ellipse(xx, yy, 6.5, 8, CORAL if xx == 3 else "#2d91a0", INK, 2)
    else:
        beard = _path("M-53-251Q-37-233-19-240Q-3-250 13-239Q34-234 55-252L52-221Q41-186 7-177Q-26-184-43-208Z", hair, INK, 3)
        beard += _path("M-31-228Q-13-200-3-194M16-222Q25-205 14-188M39-229L27-203", stroke="#b58d68" if variant == 1 else "#a97045", sw=2.5)
        if emotion == "wonder":
            beard += _ellipse(4, -228, 11, 15, "#713f38", "#e1a47c", 2)
        else:
            beard += _path("M-12-231Q3-220 20-232", stroke="#f6c79b", sw=3)
        beard += _path("M-22-244Q-4-255 9-245Q22-248 33-239Q14-230 3-238Q-11-231-30-237Z", hair, INK, 1.5)
        b += beard
        # Distinct hats, with soft crown, fur edging and a stitched cap band.
        cap = ["#d97658", "#2a7485", "#b68842"][variant % 3]
        b += _path("M-61-329Q-62-376-10-376Q48-380 62-335L48-322L-46-317Z", cap, INK, 4)
        b += _path("M-66-332Q-5-344 66-333L68-311Q4-319-65-308Z", "#684b36", INK, 3)
        b += _path("M-54-323L-43-327L-34-321L-23-327L-13-322L0-328L12-322L26-327L40-322L53-325", stroke="#d4ae70", sw=3)
        b += _path("M-39-348Q-2-370 36-346", stroke="#ecb883", sw=3)
    if flip:
        b = f'<g transform="scale(-1 1)">{b}</g>'
    return _g(b, x, y, scale, cls="art-hero")


def _cannon(x, y, scale=1, flip=False):
    b = _path("M-47-9L-59 32H48L36-9Z", "#9e6848", INK, 4)
    b += _ellipse(-26, 28, 24, 24, "#654a38", INK, 4) + _ellipse(34, 28, 24, 24, "#654a38", INK, 4)
    b += _ellipse(-26, 28, 8, 8, "#e5bd6d", INK, 2) + _ellipse(34, 28, 8, 8, "#e5bd6d", INK, 2)
    b += _path("M-49-38Q-64-29-54-7Q-17 12 83-21L99-29L90-56L72-58Q-4-42-49-38Z", "#416574", INK, 5)
    b += _ellipse(91, -42, 13, 18, "#132d3b", INK, 3)
    b += _path("M-29-37L-23-7M14-44L22-13M68-54L76-22", stroke="#91a7a1", sw=4)
    if flip:
        b = f'<g transform="scale(-1 1)">{b}</g>'
    return _g(b, x, y, scale, cls="art-cannon")


def _splash(x, y, scale=1, rotate=0):
    b = _path("M-84 25Q-38 17-42-26Q-16-24-10 5Q9-48 38-46Q30-3 18 12Q55-11 75 3Q43 20 35 38Z", CREAM, "#368f9e", 3)
    b += _ellipse(-49, -51, 7, 13, CREAM, "none", 0) + _ellipse(28, -75, 6, 10, CREAM, "none", 0)
    b += _ellipse(86, -19, 5, 9, CREAM, "none", 0)
    return _g(b, x, y, scale, rotate, "art-splash")


def _interior(p, question=False):
    b = f'<rect width="1920" height="760" fill="url(#{p}wall)"/>'
    # Spacious palace architecture, rather than a panel around the artwork.
    b += _path("M0 164Q305-34 614 156Q940-45 1269 156Q1602-32 1920 165V0H0Z", "#d1b383", "none", 0)
    b += _path("M110 735V314Q110 112 334 112Q556 112 556 314V735Z", "#edcca0", INK, 4)
    b += _path("M1372 735V314Q1372 112 1596 112Q1820 112 1820 314V735Z", "#edcca0", INK, 4)
    b += _path("M741 635V289Q741 117 960 117Q1179 117 1179 289V635Z", "#75c7cc", INK, 5)
    b += _path("M764 616V294Q764 146 960 143Q1156 146 1156 294V616Z", f"url(#{p}sky)", INK, 3)
    b += _path("M765 445Q950 432 1155 449V616H765Z", "#48b5be", "none", 0)
    b += _cloud(985, 310, .47)
    b += _ship(p, 979, 563, .34, 0, True)
    b += _path("M960 145V615M765 400H1154", stroke="#c9b58b", sw=10)
    for xx in [649, 1271]:
        b += _path(f"M{xx-35} 205H{xx+35}V690H{xx-35}Z", "#f7e5bb", INK, 3)
        b += _path(f"M{xx-49} 191H{xx+49}V224H{xx-49}ZM{xx-46} 678H{xx+46}V710H{xx-46}Z", "#cbae78", INK, 3)
        b += _path(f"M{xx-15} 238V667M{xx+13} 238V667", stroke="#dfc998", sw=3)
    b += _path("M0 706H1920V760H0Z", "#d7b488", "none", 0)
    for xx in [170, 1760]:
        b += _path(f"M{xx-28} 365 Q{xx} 390 {xx+28} 365 L{xx+14} 406 H{xx-14}Z", "#c89d4d", INK, 3)
        b += _path(f"M{xx} 404V476M{xx-25} 480H{xx+25}", stroke="#8d7445", sw=5)
        b += _path(f"M{xx} 356 Q{xx-20} 334 {xx} 311 Q{xx+18} 339 {xx} 356Z", "#efb64b", "#b78237", 2)
    return b


def _goblet(x, y, scale=1):
    b = _path("M-23-46Q-21-10 0-10Q21-10 23-46ZM0-10V13M-18 15Q0 6 18 15Z", "#e5b14c", INK, 3)
    b += _path("M-15-38Q-10-15 1-16", stroke="#fff0aa", sw=3)
    return _g(b, x, y, scale)


def _table(p):
    b = _path("M233 589Q964 553 1684 589L1746 653Q961 705 174 653Z", "#bd784b", INK, 5)
    b += _path("M195 650Q958 695 1724 650V735H195Z", "#9f5b3d", INK, 5)
    b += _path("M317 587Q969 560 1592 588L1633 652Q968 686 280 654Z", CREAM, INK, 3)
    b += _path("M305 652V724L334 705L365 726L395 706L422 727L450 707L480 728L506 707L539 730L566 708L600 731L629 709L660 732L691 711L720 734L750 713L781 735L813 712L844 734L875 715L909 735L939 715L970 734L1003 715L1035 735L1068 713L1100 734L1132 711L1165 733L1198 711L1230 731L1263 709L1296 730L1328 709L1360 728L1393 706L1425 727L1457 704L1490 726L1522 702L1555 725L1588 699L1613 722L1616 654Z", "#f3dfad", INK, 3)
    b += _path("M305 675Q960 710 1615 674", stroke=CORAL, sw=5)
    # Bread, fruit, plates and a tall ewer make the hospitality tangible.
    b += _ellipse(636, 616, 102, 23, "#d1e3d5", INK, 3)
    b += _path("M555 612Q552 555 621 553Q681 545 715 608Q663 637 555 612Z", "#d7a052", INK, 4)
    b += _path("M581 575L603 602M614 564L638 604M651 567L673 602", stroke="#f7d58c", sw=6)
    b += _ellipse(1084, 625, 116, 20, "#afcfc7", INK, 3)
    for xx, yy, rr, c in [(1020, 599, 25, "#cf6554"), (1065, 600, 30, "#e6b956"), (1113, 599, 24, "#db7654"), (1089, 568, 24, "#dba24e"), (1144, 602, 20, "#7c9f6b")]:
        b += _ellipse(xx, yy, rr, rr*.88, c, INK, 3)
        b += _path(f"M{xx} {yy-rr*.6}l4-12m-2 4q12-8 16-2q-7 8-16 2", stroke="#668259", sw=3)
    b += _path("M1449 607Q1428 597 1438 566L1447 545L1445 507L1476 505L1479 543Q1518 568 1499 608Z", "#c97850", INK, 4)
    b += _path("M1478 541Q1522 539 1522 568Q1521 591 1503 590", stroke="#bb764d", sw=11)
    b += _path("M1449 506L1475 506L1484 496L1440 494Z", "#f1cf84", INK, 3)
    b += _path("M1441 576Q1469 586 1502 570", stroke="#e6b673", sw=5)
    for xx, yy, ss in [(439, 593, 1), (823, 595, .95), (1288, 605, 1), (1552, 614, .85)]:
        b += _goblet(xx, yy, ss)
    return b


def _fox(x, y, scale=1, sable=False):
    color = "#695a48" if sable else "#b9835d"
    b = _path("M-29 12Q-76-22-70 15Q-65 43-15 33", color, INK, 3)
    b += _path("M-67 10Q-68 31-42 30Q-60 39-69 26Z", "#e6d9bb", "none", 0)
    b += _path("M-31 3Q-11-14 13-1L25 21L16 37L-23 35Z", color, INK, 3)
    b += _path("M-16 24L-20 44H-6L0 26M12 22L16 43H29L23 21", color, INK, 3)
    b += _path("M3-4L0-28L19-19L34-32L39-7L47 7L28 23L8 18Z", color, INK, 3)
    b += _path("M4 0L22 6L41-1L34 13L22 20L13 12Z", "#e7d9bc", "none", 0)
    b += _ellipse(13, -6, 3, 4, INK, "none", 0) + _ellipse(33, -8, 3, 4, INK, "none", 0)
    b += _path("M19 8L27 7L23 13Z", INK, INK, 1)
    b += _path("M7-19L11-10M31-21L32-13", stroke="#e7c4a1", sw=3)
    return _g(b, x, y, scale)


def _compass(x, y, scale=1, p=""):
    b = _ellipse(0, 0, 66, 66, "#ead29d", "#9f8d66", 3)
    b += _ellipse(0, 0, 51, 51, "none", "#b39b6b", 2)
    b += _path("M0-83L14-15L83 0L15 14L0 83L-14 15L-83 0L-14-14Z", "#2b7884", INK, 3)
    b += _path("M0-83V0L14-15ZM83 0H0L15 14ZM0 83V0L-14 15ZM-83 0H0L-14-14Z", CORAL, INK, 2)
    b += _ellipse(0, 0, 8, 8, CREAM, INK, 2)
    return _g(b, x, y, scale)


def _map(p):
    b = _path("M251 169Q314 145 356 164L1419 142Q1485 163 1501 222L1479 653Q1437 688 1366 668L328 696Q270 687 250 639Z", f"url(#{p}parchment)", INK, 5)
    b += _path("M276 183Q317 162 337 183L321 671Q278 669 272 639Z", "#eed4a2", "#b69b6b", 3)
    b += _path("M1431 163Q1499 173 1481 220L1457 631Q1438 653 1416 641L1437 201Q1466 190 1471 215", "#e3c28c", "#a98a5e", 3)
    b += _path("M347 195L1388 174L1370 640L341 662Z", "#b8d9c1", "#b39763", 3)
    # Map islands are delightfully irregular, with coast double lines.
    for d in ["M397 250L431 220L477 230L505 215L548 257L582 259L600 288L577 328L541 336L515 375L478 363L456 320L419 316L405 282Z", "M718 226L755 204L789 230L839 216L867 254L851 291L872 327L853 352L816 334L792 362L757 339L749 303L714 281Z", "M1053 231L1100 204L1129 228L1178 210L1213 239L1260 237L1274 285L1248 314L1203 317L1166 357L1128 345L1109 302L1074 286Z", "M618 446L653 422L690 447L731 441L760 473L754 515L718 536L696 577L660 552L648 515L612 493Z", "M1045 466L1086 443L1136 459L1151 493L1119 520L1078 510L1044 532L1024 504Z"]:
        b += _path(d, "#d6c991", "#729e82", 4)
    # A journey that circles several islands, with deliberate high contrast dots.
    b += _path("M430 391C365 486 426 599 542 593S821 585 811 465S920 377 968 402S1012 587 1189 568S1328 409 1245 378S1082 409 1032 365S1052 277 999 244S895 276 908 310", stroke=CORAL, sw=8, stroke_dasharray="2 19")
    for xx, yy in [(430, 391), (811, 465), (1245, 378), (908, 310)]:
        b += _ellipse(xx, yy, 10, 10, CREAM, CORAL, 4)
    b += _compass(1307, 280, .71)
    for xx, yy in [(575, 398), (953, 590), (1235, 616), (967, 334)]:
        b += _path(f"M{xx-12} {yy}q12-13 24 0q12-13 24 0", stroke="#7fac9e", sw=3)
    # A tiny drawn sailing boat stamps the route's start.
    b += _path("M413 380L446 380L437 392L421 390ZM430 379V341L415 373H430L445 369L432 348", "#fff0c4", INK, 2)
    # Chest, curved open lid, textile bundles and travel tags.
    c = _path("M-169-111L151-124L164 64L-151 82Z", f"url(#{p}wood)", INK, 5)
    c += _path("M-169-111Q-190-238-22-247Q136-251 151-124L117-133Q112-213-18-212Q-143-206-134-119Z", "#b87c4e", INK, 5)
    c += _path("M-132-120Q-145-204-17-208Q107-212 117-133Z", "#6a5140", INK, 4)
    c += _path("M-140-124Q-138-179-105-185L-40-184Q-7-175-15-133Z", "#d98b66", INK, 3)
    c += _path("M-19-134Q-24-192 14-197L74-183Q98-169 91-133Z", "#829e84", INK, 3)
    c += _path("M-118-170Q-77-181-45-164M-93-181L-85-132M18-180L61-169M42-190L39-138", stroke="#f4d39c", sw=4)
    c += _path("M-144-101L-129 73M115-113L130 67", stroke="#d2b25c", sw=20)
    c += _path("M-144-101L-129 73M115-113L130 67", stroke=INK, sw=2)
    c += _path("M-164-71L154-83M-158-17L158-32M-153 35L161 20", stroke="#7e4e32", sw=3)
    c += _path("M-22-88L31-91L34-43L-18-40Z", GOLD, INK, 4)
    c += _ellipse(7, -68, 5, 8, INK, "none", 0)
    c += _path("M-43-104Q-60-58-66-33M63-111Q90-73 85-31", stroke="#e6c58d", sw=3)
    for xx, yy, rot, sable in [(-66, 4, -9, True), (84, -1, 8, False)]:
        tag = _path("M-55-40L-43-58H43L55-40V60H-55Z", CREAM, INK, 3)
        tag += _ellipse(0, -45, 4, 4, "#bca06d", INK, 1.5)
        tag += _fox(3, 7, .64, sable)
        c += _g(tag, xx, yy, 1, rot)
    b += _g(c, 1434, 632, .98, -2)
    # An expressive pointing merchant's forearm enters the top-down map shot.
    arm = _path("M160 581L208 437Q248 411 293 436L461 489L433 565L275 523L246 636Z", "#347787", INK, 5)
    arm += _path("M427 476L470 487L449 574L408 561Z", "#e3ba70", INK, 4)
    arm += _path("M444 491L430 556", stroke="#a87b42", sw=3)
    arm += _hand(500, 519, 1.62, 15, "#e9b38b", True)
    b += _g(arm, cls="art-arm")
    # Coiled rope and a small compass outside the map are physical objects.
    b += _compass(358, 668, .63)
    return b


def scene_svg(scene: int) -> str:
    """Return one original sea-comic scene; title/caption text is separate."""
    if not isinstance(scene, int) or not 0 <= scene <= 8:
        raise ValueError("scene must be an integer from 0 through 8")
    p = f"s{scene}-"
    b = _defs(p)
    if scene in (0, 8):
        b += _background(p, title=True, sunset=scene == 8)
        b += _waves(609, calmer=True)
        if scene == 8:
            b += _city(p, 290, 659, .23)
        b += _ship(p, 1590, 708, .37, -3)
        b += _splash(1705, 705, .48, -10)
        b += _waves(704, True, calmer=True)
    elif scene == 1:
        b += _background(p)
        # Wind is a handful of long, purposeful curves, not a screen pattern.
        b += _path("M187 318Q290 277 419 302 M209 345Q306 311 374 328M1424 309Q1532 278 1647 310", stroke="#edf2d9", sw=6)
        b += _waves(548)
        b += _ship(p, 940, 626, 1.18, -4)
        b += _splash(1373, 624, 1.05, -12) + _splash(454, 648, .8, 8)
        b += _waves(693, True)
    elif scene == 2:
        b += _background(p)
        b += _city(p, 1365, 452, .66)
        b += _waves(613, calmer=True)
        # Forward deck boards and low gunwale put the viewer among the crew.
        b += _path("M0 640Q899 571 1920 643V760H0Z", "#b77d51", INK, 5)
        for xx in range(-60, 2100, 165):
            b += _path(f"M960 588L{xx} 760", stroke="#815a3e", sw=3)
        b += _person(p, 392, 731, 1.19, 0, emotion="wonder", pose="wonder")
        b += _person(p, 706, 731, 1.16, 1, emotion="wonder", pose="point")
        b += _person(p, 1040, 735, .93, 2, emotion="wonder", pose="rest")
        b += _path("M163 700Q948 647 1758 698L1754 731Q949 683 165 735Z", "#d3a069", INK, 6)
        b += _path("M179 705Q963 660 1743 705", stroke="#f1c98c", sw=6)
        for xx in [239, 540, 899, 1270, 1669]:
            b += _path(f"M{xx} 718V760", stroke=INK, sw=14)
        b += _bird(1123, 205, .9)
    elif scene == 3:
        b += _background(p)
        b += _city(p, 857, 528, 1.01, island=True)
        # Real dock planks in front of the fortified waterfront.
        b += _path("M254 618L1118 571L1193 645L252 704Z", "#d3a46c", INK, 5)
        for xx in range(315, 1180, 63):
            b += _path(f"M{xx} 613L{xx+50} 667", stroke="#946b47", sw=3)
        b += _path("M285 688V745M609 671V737M961 650V724", stroke="#80573b", sw=17)
        b += _cannon(421, 586, .88)
        b += _cannon(678, 572, .77)
        # One local celebratory salute: animation controls visibility.
        smoke = _path("M551 537Q537 519 554 507Q543 480 571 478Q583 452 603 472Q630 458 638 486Q666 485 662 509Q687 528 666 544Q640 565 615 548Q581 564 551 537Z", "#fff3d7", "#a9c8bd", 3)
        smoke += _path("M530 552L540 539L531 528L549 534L552 516L559 535L574 527L565 544L579 551L559 552L559 568L547 557Z", "#f7d07e", "#d69f50", 2)
        b += _g(smoke, cls="art-flash")
        b += _ship(p, 1439, 656, .67, -1)
        b += _path("M1275 619L1116 643L1126 661L1287 638Z", "#d2ac78", INK, 4)
        b += _waves(699, True, calmer=True)
    elif scene == 4:
        b += _interior(p)
        b += _person(p, 406, 661, 1.12, hero=True, pose="invite")
        b += _person(p, 802, 641, .95, 0, pose="rest")
        b += _person(p, 1136, 645, .97, 1, pose="rest")
        b += _person(p, 1441, 650, .96, 2, pose="rest")
        b += _table(p)
    elif scene == 5:
        b += _interior(p, question=True)
        b += _person(p, 477, 795, 1.51, hero=True, emotion="question", pose="question")
        b += _person(p, 1438, 791, 1.48, 0, pose="rest", flip=True)
        # Foreground ledge belongs to the room, and grounds the close-up.
        b += _path("M156 722Q962 689 1764 721V760H156Z", "#caa36e", INK, 5)
        b += _path("M176 730Q960 701 1747 730", stroke="#f4ddb1", sw=8)
    elif scene == 6:
        b += '<rect width="1920" height="760" fill="#825b3e"/>'
        for yy in [124, 246, 368, 490, 612, 734]:
            b += _path(f"M0 {yy}Q490 {yy-18} 960 {yy}T1920 {yy}", stroke="#674c38", sw=4)
        for xx, yy in [(154, 234), (924, 112), (1729, 338), (1750, 714)]:
            b += _path(f"M{xx} {yy}q70-19 143-1q-70 19-143 1Z", stroke="#a37a53", sw=3)
        b += _map(p)
    elif scene == 7:
        b += _background(p)
        b += _path("M0 500Q475 402 960 476Q1492 533 1920 425V760H0Z", "#46bec5", "none", 0)
        b += _city(p, 486, 490, .58)
        b += _city(p, 1530, 332, .33)
        # A broad curling wake forms the route to the distant eastern shore.
        b += _path("M551 548C670 650 837 660 984 584S1246 430 1406 425", stroke="#c2ebd7", sw=47)
        b += _path("M548 547C664 636 826 650 982 576S1244 431 1401 425", stroke=CREAM, sw=7, stroke_dasharray="1 22")
        b += _path("M1405 425L1379 407L1382 439Z", CREAM, "none", 0)
        b += _ship(p, 1098, 635, .87, -5)
        b += _splash(1432, 650, .69, -10)
        b += _compass(1642, 605, .73)
        b += _waves(715, True, calmer=True)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="760" viewBox="0 0 1920 760" fill="none" stroke-linecap="round" stroke-linejoin="round">{b}</svg>'

