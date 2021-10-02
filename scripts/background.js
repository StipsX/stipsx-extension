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

// initiate default extension settings
var config = {"darkmodeEnabled": true,
            "animationsEnabled": true,
            "colorSettings": 
            {
                "selectedPaletteIndex": 0,
                "customPaletteEnabled": false,
                "selectedPalette": {},
                "customPalette": {}
            }
        };

function applyThemeToPage(config) {
    // add theme palette
    var selectedPalette = {};
    if (config["colorSettings"]["customPaletteEnabled"])
        // rn it's not needed as they are the same, but they might be different in the future
        selectedPalette = config["colorSettings"]["customPalette"]
    else selectedPalette = config["colorSettings"]["selectedPalette"];

    var keys = Object.keys(selectedPalette);
    for (var i = 0; i < keys.length; i++) {
        document.documentElement.style.setProperty(keys[i], selectedPalette[keys[i]]);
    }

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
    // add theme mode
    const stylePath = (true) ? "styles/themes/dark.css" : "styles/themes/bright.css"
    var themeLink = document.createElement("link");
    themeLink.href = chrome.runtime.getURL(stylePath);
    themeLink.type = "text/css";
    themeLink.rel = "stylesheet";
    themeLink.setAttribute("stipsx-theme-style", ""); // used to later refresh modes

    document.head.appendChild(themeLink);
}

chrome.runtime.onInstalled.addListener(() => {
    // fetch the palettes to get the default palette (determined by selectedPaletteIndex)
    fetch(chrome.runtime.getURL("../palettes.json"))
        .then((file_content) => file_content.json())
        .then((colorPalettes) => {
            var defaultColorPalette = colorPalettes["colorPalettes"][parseInt(config["colorSettings"]["selectedPaletteIndex"])];
            config["colorSettings"]["customPalette"] = {...defaultColorPalette};
            config["colorSettings"]["selectedPalette"] = {...defaultColorPalette};

            // update config in storage
            chrome.storage.sync.set({ "darkmodeEnabled": config["darkmodeEnabled"], "animationsEnabled": config["animationsEnabled"], "colorSettings": config["colorSettings"]});

            // toggle theme on open stips tabs
            chrome.tabs.query({ url: "https://stips.co.il/*" }, (tabs) => {
                for (let j = 0; j < tabs.length; j++) {
                    chrome.scripting.executeScript(
                        {
                            target: { tabId: tabs[j].id },
                            func: applyThemeToPage,
                            args: [config]
                        }, () => { });
                }
            });
    });
});
