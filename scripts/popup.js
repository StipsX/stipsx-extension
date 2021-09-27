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
function updatePopupColors(colorPalette) {
	// update popup elements colors
	for (const color in colorPalette) {
		document.documentElement.style.setProperty(color, colorPalette[color]);
	}
	// update popup icon
	console.log(Utils.getHueFromHex(colorPalette["--color5"]));
	var targetHueColor5 = Utils.getHueFromHex(colorPalette["--color5"]);
	var targetHueColor6 = Utils.getHueFromHex(colorPalette["--color6"]);
	var targetHue = (targetHueColor5 != -1) ? targetHueColor5 : targetHueColor6;
	var resultFilter = null;
	if (targetHue == -1) { // grayscale
		resultFilter = ""; // original icon colors
	}
	else { // colorful
		resultFilter =
			`hue-rotate(-${Utils.getHueFromHex("#0ac287")}deg) ` +
			`hue-rotate(${targetHue}deg)`;
	}
	document.getElementById("appIcon").style.filter = resultFilter;
}

function loadColorPalettes() {
	/* laod all palettes icons */
	Utils.getColorPalettes(function (colorPalettes) {
		// /* update the popup colors to match selected palette */
		chrome.storage.sync.get("selectedColorPalette", ({ selectedColorPalette }) => {
			// update popup elements colors
			var pagePalette = colorPalettes[parseInt(selectedColorPalette)];
			updatePopupColors(pagePalette);
		});
		// build all palettes icons
		var container = document.getElementById("themesContainer");
		for (let i = 0; i < colorPalettes.length; i++) {
			var paletteDiv = document.createElement("div");
			var currentPalette = colorPalettes[i];
			paletteDiv.className = "colorPalette";
			paletteDiv.setAttribute("palette-index", (i).toString())
			paletteDiv.style.background = `linear-gradient(135deg, ${currentPalette["--color5"]} 30%, ${currentPalette["--color6"]} 70%)`;
			paletteDiv.addEventListener("click", function (event) {
				var pressedDiv = event.currentTarget;
				if (!pressedDiv.classList.contains("selectedPalette")) {
					// update the storage
					var paletteIndex = pressedDiv.getAttribute("palette-index");
					chrome.storage.sync.set({ "selectedColorPalette": paletteIndex });
					// update popup colors
					var pagePalette = colorPalettes[paletteIndex];
					updatePopupColors(pagePalette);

					// update stips tabs if any are open
					canvasFilter = Utils.calculateCanvasFilter(pagePalette);
					chrome.tabs.query({ url: "https://stips.co.il/*" }, (tabs) => {
						for (let j = 0; j < tabs.length; j++) {
							chrome.scripting.executeScript(
								{
									target: { tabId: tabs[j].id },
									func: function (pagePalette, canvasFilter) {
										for (const color in pagePalette) {
											document.documentElement.style.setProperty(color, pagePalette[color]);
										}
										document.documentElement.style.setProperty("--canvasFilter", canvasFilter);
									},
									args: [pagePalette, canvasFilter]
								}, () => { });
						}
					});
					// remove the selected tag from the previous selected palette (if loaded allready)
					var previousSelected = document.querySelector(".selectedPalette");
					if (previousSelected) {
						previousSelected.className = "colorPalette";
					}
					// add the selected tag to the clicked palette
					pressedDiv.classList.add("selectedPalette");
				}
			});
			container.appendChild(paletteDiv);
		}
		// after building the icons, mark the selected palette
		/* get the applied palette */
		chrome.storage.sync.get("selectedColorPalette", ({ selectedColorPalette }) => {
			document.querySelector(`.colorPalette:nth-child(${parseInt(selectedColorPalette) + 1})`).classList.add("selectedPalette");
		});
	});
};

var animationsToggleButton = document.getElementById("animationsButton");
var darkmodeToggleButton = document.getElementById("darkmodeButton");

function togglePopupDarkmode(darkmodeEnabled) {
	if (darkmodeEnabled) { // turn darkmode on
		document.getElementsByTagName("body")[0].setAttribute("darkmode", "");
	} else { // turn darkmode of
		document.getElementsByTagName("body")[0].removeAttribute("darkmode");
	}
	return darkmodeEnabled;
}

function toggleAnimations() {
	var isEnabled = animationsToggleButton.checked;
	chrome.storage.sync.set({ "animationsEnabled": isEnabled });
	// toggle animations on open stips tabs
	chrome.tabs.query({ url: "https://stips.co.il/*" }, (tabs) => {
		for (let j = 0; j < tabs.length; j++) {
			chrome.scripting.executeScript(
				{
					target: { tabId: tabs[j].id },
					func: Utils.toggleAnimationsOnStips,
					args: [isEnabled]
				}, () => { });
		}
	});
}

function toggleDarkmode() {
	var isEnabled = darkmodeToggleButton.checked;
	togglePopupDarkmode(isEnabled);
	chrome.storage.sync.set({ "darkmodeEnabled": isEnabled });
	// toggle darkmdoe on open stips tabs
	chrome.tabs.query({ url: "https://stips.co.il/*" }, (tabs) => {
		for (let j = 0; j < tabs.length; j++) {
			chrome.scripting.executeScript(
				{
					target: { tabId: tabs[j].id },
					func: Utils.toggleDarkmodeOnStips,
					args: [isEnabled]
				}, () => { });
		}
	});
}
darkmodeToggleButton.addEventListener("click", toggleDarkmode);
animationsToggleButton.addEventListener("click", toggleAnimations);

// load checkboxes
chrome.storage.sync.get("darkmodeEnabled", ({ darkmodeEnabled }) => {
	if (darkmodeEnabled) {
		darkmodeToggleButton.checked = togglePopupDarkmode(darkmodeEnabled);
	}
});
chrome.storage.sync.get("animationsEnabled", ({ animationsEnabled }) => {
	animationsToggleButton.checked = animationsEnabled;
});

loadColorPalettes();