// Consider creating a work queue structure that takes in an array of shirts and generates the image data?

// map the result array of shirts into global_shirts.
// for each item,
//   let shirt = new Shirt(json_data);
//   containerElem.appendChild(shirt.render());
//   return shirt;

// Have the rendered shirt display skeleton elements until .toVector() and .toRaster() have finished.
// When either finishes, update the rendered element with the new content.
// You'll have to have skeleton elements for the title, author name, both download buttons, and the rendered image.
// The title and author name will be trivial, so maybe those aren't necessary.
// Update: This doesn't take long enough to matter. You could prepopulate the results with skeletons, but you can do that later.

// TODO: Run through and see how it looks to change the double-quotes to single-quotes.

// TODO: Look into interfacing with https://ecast.jackboxgames.com/room/TEST?userId= to get the artifact based on the four-letter code.
// This would probably only work while the game is ongoing, but it's worth a shot, I think :)

let shirts = [];

class Shirt {
  constructor(data) {
    this._data = data;
    this._vector = null;
    this._raster = null;
    this._elem = null;
    this._DOMRef = {};
  }
  
  // Straightforward value getter for shirt metadata.
  get metadata() {
    return {
      "slogan": this._data.slogan.slogan,
      "stats": {
        "battles": this._data.battles,
        "wins": this._data.wins,
        "badges": {
          'winner': !!this._data.gameWinner,
          'runnerUp': (!!this._data.streakWinner || !!this._data.gauntletWinner) && !this._data.gameWinner,
        },
      },
      "players": {
        "designer": {
          "label": "Designed by",
          "name": this._data.designer.name,
        },
        "author": {
          "label": "Written by",
          "name": (this._data.slogan.author || {}).name || "Jackbox",
        },
        "artist": {
          "label": "Drawn by",
          "name": (this._data.drawing.artist || {}).name || "Jackbox",
        }
      },
    }
  }
  
  /** 
   * Generate or retrieve an object URL for an SVG version of the shirt.
   * @return {string} An object URL that leads to the SVG.
   */
  async toVector() {
    if (this._vector !== null) return this._vector;
     
    // Create a namespaced SVG element.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 300 300");
    
    // Create a solid color background rectangle for the vector.
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("x", "0");
    background.setAttribute("y", "0");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", this._data.drawing.background);
    
    // Add the background to the SVG.
    svg.appendChild(background);
    
    // Iterate the lines in the drawing data.
    for (const line of this._data.drawing.lines) {
      // Create a namespaced polyline element.
      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      
      // If the line is a single point, add a duplicate point to ensure it appears.
      const isDot = line.points.length === 1;
      const pointsWithDots = (isDot ? Array(2).fill(line.points[0]) : line.points);
      
      // Convert the array of points to the required "x1,y1 x2,y2" format.
      const points = pointsWithDots.map(p => `${p.x},${p.y}`).join(" ");
      
      // Set the all attributes required to match the game visuals.
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", line.color);
      polyline.setAttribute("stroke-width", line.thickness);
      polyline.setAttribute("stroke-linecap", "round");
      polyline.setAttribute("stroke-linejoin", "round");
      
      // Add the points to the polyline.
      polyline.setAttribute("points", points);
      
      // Add the polyline to the SVG.
      svg.appendChild(polyline);
    }
          
    // Serialize the XML structure of the SVG to a string.
    const serializer = new XMLSerializer();
    const stringData = serializer.serializeToString(svg);
    
    // Convert the XML structure of the SVG element to a blob.
    const blob = new Blob([stringData], {type: 'image/svg+xml'});
    
    // Create an object URL for the XML blob.
    this._vector = URL.createObjectURL(blob);
    
    return this._vector;
  }
  
  /** 
   * Generate or retrieve an object URL for a PNG version of the shirt.
   * @return {string} An object URL that leads to a PNG file.
   */
  toRaster() {
    return new Promise(async (resolve, reject) => {
      const url = await this.toVector();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 512;
      canvas.height = 512;
      
      const img = new Image(512, 512);
      img.onload = async () => {
        ctx.drawImage(img, 0, 0, 512, 512);
        const blob = await new Promise((res, rej) => canvas.toBlob(res));
        this._raster = URL.createObjectURL(blob);
        resolve(this._raster);
      }
      
      img.src = url;
    });
  }
   
  render() {
    if (this._elem !== null) return this._elem;
    
    // This should display a skeleton screen first.
    // Store each loadable child into this._DOMRef, then update them individually as images become available.
    
    let container = document.createElement("div");
    container.classList.add("shirt");
    
    let img = new Image(300, 300);
    img.style.background = this._data.drawing.background;
    // img.classList.add("loading");
    
    let infoInner = document.createElement("div");
    infoInner.classList.add("info-inner");
    
    let sloganParsed = (new DOMParser()).parseFromString(this.metadata.slogan, "text/html").body.textContent;
    
    let slogan = document.createElement("div");
    slogan.classList.add("slogan");
    slogan.textContent = sloganParsed;
    
    let designer = document.createElement("div");
    designer.classList.add("designer");
    designer.textContent = "by ";
    let name = document.createElement("span");
    name.textContent = " " + this.metadata.players.designer.name;
    
    designer.appendChild(name);
    slogan.appendChild(designer);
    infoInner.appendChild(slogan);
    
    for (let v of [this.metadata.players.author, this.metadata.players.artist]) {
      let cont = document.createElement("div");
      let name = document.createElement("span");
      cont.textContent = v.label;
      name.textContent = " " + v.name;
      cont.appendChild(name);
      infoInner.appendChild(cont);
    }
    
    let filename = sloganParsed.replace(/[^A-z0-9\s\_]/g, "").replace(/[\s\-\_]+/g,"_").toLowerCase();
    
    let saveText = document.createElement("span");
    saveText.classList.add("save-text");
    saveText.textContent = "Save\u00A0";
    
    let vectorButton = document.createElement("a");
    vectorButton.classList.add("download");
    vectorButton.setAttribute("target", "_blank");
    vectorButton.download = `${filename}.svg`;
    vectorButton.textContent = "SVG";
    vectorButton.prepend(saveText);
    
    let rasterButton = document.createElement("a");
    rasterButton.classList.add("download");
    rasterButton.target = "_blank";
    rasterButton.download = `${filename}.png`;
    rasterButton.textContent = "PNG";
    rasterButton.prepend(saveText.cloneNode(true));
    
    this._elem = container;
    this._DOMRef.img = img;
    this._DOMRef.vectorButton = vectorButton;
    this._DOMRef.rasterButton = rasterButton;
    
    container.appendChild(img);
    container.appendChild(vectorButton);
    container.appendChild(rasterButton);
    
    let info = document.createElement("div");
    info.classList.add("info");
    info.appendChild(infoInner);
    
    container.appendChild(info);
    
    // You could chain the last two assignments here, but it's unnecessary and hard to follow.
    this.toRaster().then(async rasterUrl => {
      img.src = rasterUrl;
      rasterButton.href = rasterUrl;
      vectorButton.href = await this.toVector();
    });
    
    return container;
  }
  
  remove() {
    if (this._elem === null) return;
    URL.revokeObjectURL(this._vector);
    URL.revokeObjectURL(this._raster);
    this._elem.remove();
  }
}

/**
 * Load past game data from a Jackbox URL.
 * @param {string} rawURL A game URL as a string.
 * @return {!Array<Shirt>} A list of shirts for the game.
 */
async function loadGameData(rawURL = "") {
  let dataURL = null;
  
  // Ensure the provided string is a valid URL.
  try {
    dataURL = new URL(rawURL);
  } catch (error) {
    return { "error": "Malformed URL" };
  }
  
  // If the URL isn't a subdomain of jackbox.tv, return an error.
  // If the URL isn't a TeeKOGame archive, return an error.
  if (/^[^\.]+\.jackbox\.tv/.test(dataURL.host) && /^\/artifact\/TeeKOGame\/[A-z0-9]+\/$/.test(dataURL.pathname)) {
    dataURL.protocol = "https:";
    dataURL.hostname = "fishery.jackboxgames.com";
  } else {
    return { "error": "Incorrect domain" };
  }
  
  // dataURL is well-formed and converted.
  // Client can proceed with synchronous fetch of JSON data.
  
  // Return an empty object if the request wasn't successful.
  let data = await fetch(dataURL, { referrer: rawURL, cache: "force-cache" }).then(res => res.ok ? res.json() : { "error": "Bad request" });
  
  // Jackbox Games orders things weirdly: [the winner, ...the runners up in appearance order, ...all others].
  // Create a custom sort function to bin the shirts and then return a flattened set.
  let sorted = [[],[],[]];
  for (i of data.shirts) {
    sorted[i.gameWinner ? 0 : (i.streakWinner || i.gauntletWinner ? 1 : 2)].push(i);
  }
  
  return sorted.flat().map(shirt => new Shirt(shirt));
}

document.getElementById("submit").addEventListener("click", async function() {
  const url = document.getElementById("url").value;
  
  let oldShirts = shirts;
  for (let oldShirt of oldShirts) {
    oldShirt.remove();
  }
  
  shirts = await loadGameData(url);
  for (let shirt of shirts) {
    document.getElementById("results").appendChild(shirt.render());
  }
});