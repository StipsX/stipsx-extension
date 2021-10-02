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

var config = {};

async function updatePopupColors(selectedPalette) {
	// update popup elements colors
    var keys = Object.keys(selectedPalette);
    for (var i = 0; i < keys.length; i++) {
        document.documentElement.style.setProperty(keys[i], selectedPalette[keys[i]]);
    }
	// update popup icon
	var targetHueColor5 = Utils.getHueFromHex(selectedPalette["--color5"]);
	var targetHueColor6 = Utils.getHueFromHex(selectedPalette["--color6"]);
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

async function loadColorPalettes(colorSettings) {
	// laod all palettes icons
	Utils.getColorPalettes(function (colorPalettes) {
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
					colorSettings["selectedPaletteIndex"] = paletteIndex;
					colorSettings["selectedPalette"] = colorPalettes[paletteIndex];
					chrome.storage.sync.set({"colorSettings": colorSettings});
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
		document.querySelector(`.colorPalette:nth-child(${parseInt(colorSettings["selectedPaletteIndex"]) + 1})`).classList.add("selectedPalette");
	});
};

var animationsToggleButton = document.getElementById("animationsButton");
var darkmodeToggleButton = document.getElementById("darkmodeButton");
var customPaletteButton = document.getElementById("customPaletteButton");
var customColor1Input = document.getElementById("customColor1Input"),
	customColor2Input = document.getElementById("customColor2Input");

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
	config["animationsEnabled"] = isEnabled;
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
	config["darkmodeEnabled"] = isEnabled;
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
function toggleCustomPalette() {
	config["colorSettings"]["customPaletteEnabled"] = customPaletteButton.checked;
	chrome.storage.sync.set({"colorSettings": config["colorSettings"]});

	var themesContainer = document.getElementById("themesContainer");
	if(config["colorSettings"]["customPaletteEnabled"]) {
		themesContainer.setAttribute("disabled", "");
		updatePopupColors(config["colorSettings"]["customPalette"]);
	} else {
		if (themesContainer.hasAttribute("disabled")) {
			themesContainer.removeAttribute("disabled");
			updatePopupColors(config["colorSettings"]["selectedPalette"]);
		}
	}

	// toggle darkmdoe on open stips tabs
	chrome.tabs.query({ url: "https://stips.co.il/*" }, (tabs) => {
		for (let j = 0; j < tabs.length; j++) {
			var applyMode = false; // no need to refresh bright/dark mode because this functions toggles only the custom palette
			chrome.scripting.executeScript(
				{
					target: { tabId: tabs[j].id },
					func: Utils.applyThemeToPage,
					args: [config, applyMode]
				}, () => { });
		}
	});
}


function onChosenColor(event) {
	var currentInputBtn = event.currentTarget,
		inputContainer = currentInputBtn.parentElement;
	// see if changes were made to the color: 
	if(inputContainer.style.backgroundColor == "" ||
		(inputContainer.style.backgroundColor.startsWith("rgb") && Utils.rgbToHex(inputContainer.style.backgroundColor) != currentInputBtn.value))
	{
		inputContainer.style.backgroundColor = currentInputBtn.value;

		config["colorSettings"]["customPalette"]["--color5"] = customColor1Input.value;
		config["colorSettings"]["customPalette"]["--color6"] = customColor2Input.value;

		chrome.storage.sync.set({"colorSettings": config["colorSettings"]});
		if (config["colorSettings"]["customPaletteEnabled"]) {
			updatePopupColors(config["colorSettings"]["customPalette"]);

			// toggle darkmdoe on open stips tabs
			chrome.tabs.query({ url: "https://stips.co.il/*" }, (tabs) => {
				for (let j = 0; j < tabs.length; j++) {
					var applyMode = false; // no need to refresh bright/dark mode because this functions toggles only the custom palette
					chrome.scripting.executeScript(
						{
							target: { tabId: tabs[j].id },
							func: Utils.applyThemeToPage,
							args: [config, applyMode]
						}, () => { });
				}
			});
		}
	}
}

function initPopupUI() {
	// init buttons
	darkmodeToggleButton.addEventListener("click", toggleDarkmode);
	animationsToggleButton.addEventListener("click", toggleAnimations);
		customPaletteButton.addEventListener("click", toggleCustomPalette);
	customColor1Input.addEventListener("blur", onChosenColor);
	customColor2Input.addEventListener("blur", onChosenColor);

	// initialize color settings
	chrome.storage.sync.get("colorSettings", ({ colorSettings }) => {
		config["colorSettings"] = colorSettings;
		// load the color palettes icons
		loadColorPalettes(colorSettings);

	    var selectedPalette = {};
	    if (colorSettings["customPaletteEnabled"])
	        selectedPalette = colorSettings["customPalette"]
	    else selectedPalette = colorSettings["selectedPalette"];

	    var customPalette = colorSettings["customPalette"];
	    var customPaletteEnabled = colorSettings["customPaletteEnabled"];

		// update popup elements colors
		updatePopupColors(selectedPalette);

		// update the ui related to picking the CUSTOM colors
		customColor1Input.value = colorSettings["customPalette"]["--color5"];
		customColor1Input.parentElement.style.backgroundColor = customPalette["--color5"];

		customColor2Input.value = colorSettings["customPalette"]["--color6"];
		customColor2Input.parentElement.style.backgroundColor = customPalette["--color6"];

		if (colorSettings["customPaletteEnabled"]) {
			customPaletteButton.checked = true;
			document.getElementById("themesContainer").setAttribute("disabled", "");
		}
	});

	// initialize darkmode
	chrome.storage.sync.get("darkmodeEnabled", ({ darkmodeEnabled }) => {
		config["darkmodeEnabled"] = darkmodeEnabled;
		if (darkmodeEnabled) {
			darkmodeToggleButton.checked = togglePopupDarkmode(darkmodeEnabled);
		}
	});

	// initialize animation
	chrome.storage.sync.get("animationsEnabled", ({ animationsEnabled }) => {
		config["animationsEnabled"] = animationsEnabled;
		animationsToggleButton.checked = animationsEnabled;
	});
}

initPopupUI();