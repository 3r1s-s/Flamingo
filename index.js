async function getJSONData(url, params) {
    const response = await fetch(url + new URLSearchParams(params));
    const jsonData = await response.text();
    return Promise.resolve(jsonData);
}

errors = {"Continue":"100","Switching protocols":"101","Processing":"102","Early Hints ":"103","OK":"200","Created":"201","Accepted":"202","Non-Authoritative Information":"203","No Content":"204","Reset Content":"205","Partial Content":"206","Multi-Status":"207","Already Reported":"208","IM Used":"226","Multiple Choices":"300","Moved Permanently":"301","Moved Temporarily":"302","See Other":"303","Not Modified":"304","Use Proxy":"305","Switch Proxy":"306","Temporary Redirect":"307","Permanent Redirect":"308","Bad Request":"400","Unauthorized":"401","Payment Required":"402","Forbidden":"403","Not Found":"404","notFound":"404","Method Not Allowed":"405","Not Acceptable":"406","Proxy Authentication Required":"407","Request Timeout":"408","Conflict":"409","Gone":"410","Length Required":"411","Precondition Failed":"412","Payload Too Large":"413","URI Too Long":"414","Unsupported Media Type":"415","Range Not Satisfiable":"416","Expectation Failed":"417","I'm a Teapot":"418","Misdirected Request":"421","Unprocessable Entity":"422","Locked":"423","Failed Dependency":"424","Too Early":"425","Upgrade Required":"426","Precondition Required":"428","Too Many Requests":"429","Request Header Fields Too Large":"431","Unavailable For Legal Reasons":"451","Internal Server Error":"500","Not Implemented":"501","Bad Gateway":"502","Service Unavailable":"503","Gateway Timeout":"504","HTTP Version Not Supported":"505","Variant Also Negotiates":"506","Insufficient Storage":"507","Loop Detected":"508","Not Extended":"510","Network Authentication Required":"511"}


function swap(json) {
    const ret = {};
    for (const key in json) {
        ret[json[key]] = key;
    }
    return ret;
}

function deHTML(input) { //also stolen
    let dhout = input;
    dhout = dhout.replaceAll("&", "&amp;");
    dhout = dhout.replaceAll("<", "&lt;");
    dhout = dhout.replaceAll(">", "&gt;");
    dhout = dhout.replaceAll('"', "&quot;");
    dhout = dhout.replaceAll("'", "&apos;");
    dhout = dhout.replaceAll("\n", "<br>");
    return dhout;
}

const IMAGE_HOST_WHITELIST = [ //stolen frome wl
	// Meower
	"https://http.meower.org/",
	"https://assets.meower.org/",
	"https://api.meower.org/",
	"https://forums.meower.org/",
	
	// not everyone can add urls to go.meower.org, should be fine
	"https://go.meower.org/",
	"https://nextcloud.meower.org/",

	// cubeupload
	"https://u.cubeupload.com/",
	"https://cubeupload.com/",

	// imgBB
	"https://i.ibb.co/",

	// Tenor
	"https://media.tenor.com/",
	"https://tenor.com/",
	"https://c.tenor.com/",

	// Scratch (assets file uploading exists)
	"https://assets.scratch.mit.edu/",
	"https://cdn2.scratch.mit.edu/",
	"https://cdn.scratch.mit.edu/",
	"https://uploads.scratch.mit.edu/",

	// Discord
	"https://cdn.discordapp.com/",
	"https://media.discordapp.net/",
];

let hpage = null;
let is404 = null;

document.addEventListener("DOMContentLoaded", function () {
    const reloadButton = document.getElementById("reload");
    const postButton = document.getElementById("postbutton");
    const typeMessage = document.querySelector(".type-message");
    const usernameInput = document.getElementById("username");

    reloadButton.addEventListener("click", reload);
    postButton.addEventListener("click", function () {
        fetch("https://webhooks.meower.org/post/home", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                post: typeMessage.value,
                username: usernameInput.value,
            }),
        })
            .then((response) => response.text())
            .then(() => reload());
        typeMessage.value = "";
    });

    typeMessage.addEventListener("keydown", function (event) {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            
            sendPost(typeMessage, usernameInput);
        }
    });

    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    const hpage = params.page || null;
    const is404 = params.error || null;
    console.log(`Page: ${hpage}`);
    reload()
});

function sendPost(Message, Username) {
    fetch("https://webhooks.meower.org/post/home", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            post: Message.value,
            username: Username.value,
        }),
    })
        .then((response) => response.text())
        .then(() => {
            Message.value = "";
            reload();
        });
}


function ghome(data) {
    const data_ = JSON.parse(data);
    const postsContainer = document.getElementById("posts");
    postsContainer.innerHTML = "";

    if (!data_["error"]) {
        data_["autoget"].forEach((element) => {
            try {
                if (element["unfiltered_p"] && document.getElementById("badwords").checked) {
                    if (["Discord", "Webhooks", "Revower"].includes(element["u"])) {
                        element["u"] = element["unfiltered_p"].split(":")[0];
                        element["unfiltered_p"] = element["unfiltered_p"].split(":").slice(1).join(":");
                    }
                    postsContainer.innerHTML += `
                        <div class="post">
                            <h2 id="username">${element["u"]}</h2>
                            <p>${deHTML(element["unfiltered_p"])}</p>
                        </div>`;
                } else {
                    if (["Discord", "Webhooks", "Revower"].includes(element["u"])) {
                        const originalUsername = element["u"];
                        element["u"] = element["p"].split(":")[0];
                        element["p"] = element["p"].split(":").slice(1).join(":");
                    }
                    const iterator = element["p"].matchAll(/\[([^\]]+?): (https:\/\/[^\]]+?)\]/gs);
                    const images = [];
                    const videos = [];

                    for (const result of iterator) {
                        try {
                            new URL(result[2]);
                        } catch (e) {
                            continue;
                        }

                        if (!IMAGE_HOST_WHITELIST.some((o) => result[2].toLowerCase().startsWith(o.toLowerCase()))) {
                            return;
                        }

                        images.push({
                            title: result[1],
                            url: result[2],
                        });

                        if (images.length >= 3) {
                            break;
                        }
                    }

                    postsContainer.innerHTML += `
                        <div class="post" id="${element["post_id"]}">
                            <h2 id="username">${element["u"]}</h2>
                            <p>${deHTML(element["p"])}</p>
                        </div>`;

                    const imagesContainer = document.createElement("div");
                    imagesContainer.className = "post-images";
                    imagesContainer.id = `${element["post_id"]}-images`;
                    document.getElementById(`${element["post_id"]}`).appendChild(imagesContainer);

                    images.forEach((image) => {
                        // Create an anchor (<a>) element
                        const anchorElement = document.createElement("a");
                        anchorElement.href = image["url"]; // Set the href to the image URL
                        anchorElement.target = "_blank"; // Open the link in a new tab/window

                        // Create an image (<img>) element
                        const imgElement = document.createElement("img");
                        imgElement.src = image["url"];

                        // Append the image to the anchor element
                        anchorElement.appendChild(imgElement);

                        // Append the anchor element to the images container
                        imagesContainer.appendChild(anchorElement);
                    });

                    videos.forEach((video) => {
                    });
                }
            } catch (err) {
                console.log(`ERROR ON:${element}; ${err}`);
            }
        });
    } else {
        postsContainer.innerHTML += `
            <div class="post">
                <h3 id="username">There was an error while trying to get the page</h3>
                <p>Error: ${data_["type"]}</p>
                <img src="https://raw.githubusercontent.com/meower-media-co/http-meower/main/imgs/${errors[data_["type"]]}.jpg">
            </div>`;
    }
}

function reload() {
    if (hpage === null) {
        if (is404) {
            getJSONData('https://api.meower.org/404')
                .then((data) => { ghome(data) });
        } else {
            getJSONData('https://api.meower.org/home')
                .then((data) => { ghome(data) });
        }
    } else {
        console.log(`Loading page ${hpage}`);
        getJSONData(`https://api.meower.org/home?`, { "page": hpage })
            .then((data) => { ghome(data) });
    }
}
