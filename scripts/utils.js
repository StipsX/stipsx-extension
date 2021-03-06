/*
Copyright 2021-PRESENT StipsX

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
class Utils {
    static BRIGHTMODE_STYLE_PATH = "styles/themes/bright.css";
    static DARKMODE_STYLE_PATH = "styles/themes/dark.css";

    static DISABLE_ANIMATIONS_STYLE_PATH = "styles/themes/disable-animations.css";

    static COLOR_PALETTES_JSON = "../palettes.json";

    static rgbToHex = function (rgb) {
        return `#${rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).slice(1).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('')}`;
    };

    static getHueFromHex = function (hexString) {
        hexString = hexString.slice(hexString.search('#') + 1);
        let r = parseInt(hexString.slice(0, 2), 16), g = parseInt(hexString.slice(2, 4), 16), b = parseInt(hexString.slice(4, 6), 16);
        let v = Math.max(r, g, b), c = v - Math.min(r, g, b);
        let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c));
        if (v && c / v == 0) {// if saturation is 0 - gray
            return -1;
        }
        return Math.round(60 * (h < 0 ? h + 6 : h));
    };

    // used to update canvas colors (used in the profile page, for trust score circle)
    static calculateCanvasFilter = function (colorPalette) {
        var targetHue = Utils.getHueFromHex(colorPalette["--color6"]);
        var resultFilter = null;
        if (targetHue == -1) { // grayscale
            resultFilter = "saturate(0)"; // original icon colors
        }
        else { // colorful
            resultFilter =
                `sepia(100%) hue-rotate(-${Utils.getHueFromHex("#99886b")}deg) ` +
                `hue-rotate(${targetHue}deg)`;
        }
        return resultFilter;
    }

    static getColorPalettes = function (callback) {
        fetch(chrome.runtime.getURL(Utils.COLOR_PALETTES_JSON))
            .then((file_content) => file_content.json())
            .then((colorPalettes) => {
                colorPalettes = colorPalettes["colorPalettes"];
                callback(colorPalettes);
            });
    }

    static applyCustomPalette = function (color5, color6) {
        document.documentElement.style.setProperty("--color5", color5);
        document.documentElement.style.setProperty("--color6", color6);
    }
    // toggle animations (on a stips tab)
    static toggleAnimationsOnStips = function (animationsEnabled) {
        if (animationsEnabled) { // enable animations
            var allLinks = document.head.getElementsByTagName("link");
            for (let i = 0; i < allLinks.length; i++) {
                var link = allLinks[i];
                if (link.hasAttribute("stipsx-disable-animations-style")) {
                    link.remove();
                }
            }
        } else { // disable animations
            var stylePath = chrome.runtime.getURL("styles/themes/disable-animations.css");

            var animationDisableLink = document.createElement("link");
            animationDisableLink.href = stylePath;
            animationDisableLink.type = "text/css";
            animationDisableLink.rel = "stylesheet";
            animationDisableLink.setAttribute("stipsx-disable-animations-style", ""); // used to later refresh modes

            document.head.appendChild(animationDisableLink);
        }
    };

    // toggle darekmode (on a stips tab)
    static toggleDarkmodeOnStips = function (darkmodeEnabled) {
        var newHref = chrome.runtime.getURL((darkmodeEnabled) ? "styles/themes/dark.css" : "styles/themes/bright.css");
        var allLinks = document.head.getElementsByTagName("link");
        for (let i = 0; i < allLinks.length; i++) {
            var link = allLinks[i];
            if (link.hasAttribute("stipsx-theme-style")) {
                link.setAttribute("href", newHref);
            }
        }
    };

    static applyThemeToPage = function (config, applyMode=true) {
        // fetch the selected color palette
        var selectedPalette = {};
        if (config["colorSettings"]["customPaletteEnabled"])
            // rn it's not needed as they are the same, but they might be different in the future
            selectedPalette = config["colorSettings"]["customPalette"]
        else selectedPalette = config["colorSettings"]["selectedPalette"];

        for (const color in selectedPalette) {
            document.documentElement.style.setProperty(color, selectedPalette[color]);
            // copy of Utils.calculateCanvasFilter()
            // when called from runtime.onInstalled(), callind Utils.*() will result in an error as it doesn't recognize Utils
            var getHueFromHex = function (hexString) {
                hexString = hexString.slice(hexString.search('#') + 1);
                let r = parseInt(hexString.slice(0, 2), 16), g = parseInt(hexString.slice(2, 4), 16), b = parseInt(hexString.slice(4, 6), 16);
                let v = Math.max(r, g, b), c = v - Math.min(r, g, b);
                let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c));
                if (v && c / v == 0) {// if saturation is 0 - gray
                    return -1;
                }
                return Math.round(60 * (h < 0 ? h + 6 : h));
            }
            var targetHue = getHueFromHex(selectedPalette["--color6"]);
            var resultFilter = null;
            if (targetHue == -1) { // grayscale
                resultFilter = "saturate(0)"; // original icon colors
            }
            else { // colorful
                resultFilter =
                    `sepia(100%) hue-rotate(-${getHueFromHex("#99886b")}deg) ` +
                    `hue-rotate(${targetHue}deg)`;
            }
            document.documentElement.style.setProperty("--canvasFilter", resultFilter);
        }
        // apply dark/bright mode
        if (applyMode) {
            var stylePath = chrome.runtime.getURL((config["darkmodeEnabled"]) ? Utils.DARKMODE_STYLE_PATH : Utils.BRIGHTMODE_STYLE_PATH);
            var themeLink = document.createElement("link");
            themeLink.href = stylePath;
            themeLink.type = "text/css";
            themeLink.rel = "stylesheet";
            themeLink.setAttribute("stipsx-theme-style", ""); // used to later refresh modes

            document.head.appendChild(themeLink);
        }
    }
}
