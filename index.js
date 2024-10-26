const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
const _ = require("lodash");
const levenshtein = require("fast-levenshtein");

let json = [];
const ucData = JSON.parse(fs.readFileSync("./db-refs/ucs.json"));
const tehsilData = JSON.parse(fs.readFileSync("./db-refs/tehsils.json"));

ucMatching = []

function getClosestTehsil(tehsil){
	if(tehsil === "DGBZ") return "DATA GUNJBUX TOWN";

	let differenceLevel = 100000;
	let closestMatch = "";
	tehsilData.forEach(t=>{
		const difference = levenshtein.get(t.opName, tehsil.toLowerCase())
		if(difference<differenceLevel){
			differenceLevel = difference;
			closestMatch = t.name;
		}
	});

	if(differenceLevel>5) console.log(`Abnormal tehsil value: ${tehsil}`);
	
	return closestMatch;
}

function getClosestUC(uc){

	let differenceLevel = 100000;
	let closestMatch = "";
	ucData.forEach(u=>{
		const difference = levenshtein.get(u.name, uc)
		if(difference<differenceLevel){
			differenceLevel = difference;
			closestMatch = u.name;
		}
	});

	// console.log(`UC input: ${uc} , return: ${closestMatch}`);
	ucMatching.push({input: uc, out:closestMatch});
	
	return closestMatch;
}

function capitalizeFirstLetter(str) {
	return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatUCString(str) {
	if (str.length > 3) {
		const regex = /(.{2,})(.*?\1)/;

		const match = regex.exec(str);

		if (match) {
			const pattern = match[1];

			let index = str.indexOf(pattern);
			index = str.indexOf(pattern, index + pattern.length);

			if (index !== -1) {
				str = str.slice(0, index) + str.slice(index + pattern.length);
			}
		}
	}

	str = str.replace(/\(.*?\)/g, "");
	str = str.replace(/([a-zA-Z])\1/g, "$1");

	if (!/^[a-zA-Z]/.test(str)) {
		str = "UC " + str;
	}

	return str.trim();
}

function getFirstName(name) {
	name = name.trim();
	const indexOfLastSpace = name.lastIndexOf(" ");
	if (indexOfLastSpace === -1) {
		return name;
	}
	return name.slice(0, indexOfLastSpace);
}

function getLastName(name) {
	name = name.trim();
	const indexOfLastSpace = name.lastIndexOf(" ");

	if (indexOfLastSpace === -1) {
		return "";
	}

	return name.slice(indexOfLastSpace + 1, name.length);
}

async function dataFromAllFiles(dirPath){
	const resultsArray = [];

	// Get list of files in directory
	const files = fs.readdirSync(dirPath);
  
	for (const file of files) {
	  const filePath = path.join(dirPath, file);
  
	  // Check if the file has a .csv extension
	  if (path.extname(file) === '.csv') {
		const csvData = await csvTo2DArray(filePath);
		resultsArray.push(...csvData); // Add data from each file to resultsArray
	  }
	}
  
	return resultsArray;
}

function csvTo2DArray(filePath) {
	const rows = [];

	return new Promise((resolve, reject) => {
		fs.createReadStream(filePath)
			.pipe(csv({ headers: false }))
			.on("data", (row) => {
				rows.push(Object.values(row)); // Convert each row object to an array of values
			})
			.on("end", () => resolve(rows))
			.on("error", (error) => reject(error));
	});
}

async function largeFileParser() {
	const data = await csvTo2DArray("fresh.csv");

	let currentUCMO = {};

	for (const [i, row] of data.entries()) {
		if (row[6] !== "-") {
			if (i !== 0) {
				json.push(currentUCMO);
			}
			currentUCMO = {};

			obj = {
				sr: row[0],
				division: row[1],
				district: row[2],
				townOrTehsil: row[3],
				uc: row[4],
				firstName: getFirstName(row[5]),
				lastName: getLastName(row[5]),
				role: "UCMO",
				gender: row[6] === "M" ? "MALE" : "FEMALE",
				phone: `0${row[7]}`,
				CNIC: row[8],
				aics: [
					{
						sr: row[0],
						division: row[1],
						district: row[2],
						townOrTehsil: row[3],
						uc: row[4],
						firstName: getFirstName(row[9]),
						lastName: getLastName(row[9]),
						role: "AIC",
						gender: row[10] === "M" ? "MALE" : "FEMALE",
						phone: `0${row[11]}`,
						CNIC: row[12],
					},
				],
			};
			currentUCMO = obj;
		} else {
			const aicUC = currentUCMO.uc;
			aicObj = {
				sr: row[0],
				division: row[1],
				district: row[2],
				townOrTehsil: row[3],
				uc: aicUC,
				firstName: getFirstName(row[9]),
				lastName: getLastName(row[9]),
				role: "AIC",
				gender: row[10] === "M" ? "MALE" : "FEMALE",
				phone: `0${row[11]}`,
				CNIC: row[12],
			};
			currentUCMO.aics.push(aicObj);

			if (i === data.length - 1) {
				json.push(currentUCMO);
			}
		}
	}

	fs.writeFileSync("fresher.json", JSON.stringify(json, null, 2));
}

async function smallFileParser() {
	const data = await csvTo2DArray("./oldcsv/tinyfile.csv");

	let jsonArray = [];

	let currentUCMO = {};
	let currentAIC = {};

	for (const [i, row] of data.entries()) {
		obj = {
			sr: row[0],
			division: row["1"],
			district: capitalizeFirstLetter(row[2]),
			townOrTehsil: capitalizeFirstLetter(row[3]),
			uc: row[4],
			firstName: capitalizeFirstLetter(getFirstName(row[5])),
			lastName: capitalizeFirstLetter(getLastName(row[5])),
			role:
				row[9] === "Mobile team"
					? "FLW"
					: row[9] === "Area Incharge"
					? "AIC"
					: "UCMO",
			phone: `0${row[7]}`,
			CNIC: row[6],
		};

		if (obj.role === "UCMO") {
			if (Object.keys(currentUCMO).length !== 0) {
				jsonArray.push(currentUCMO);
			}
			currentUCMO = obj;
		} else if (obj.role === "AIC") {
			if (!currentUCMO.aics) {
				currentUCMO.aics = [];
			}
			currentAIC = obj;
			currentUCMO.aics.push(obj);
		} else {
			if (!currentAIC.flws) {
				currentAIC.flws = [];
			}
			currentAIC.flws.push(obj);
		}

		if (i === data.length - 1) {
			jsonArray.push(currentUCMO);
		}
	}

	fs.writeFileSync("greatwork.json", JSON.stringify(jsonArray, null, 2));
}

async function ucparser() {
	const data = await csvTo2DArray("therealshit.csv");

	let ucArray = [];

	for (row of data) {
		if (row[4] !== "") {
			ucArray.push(row[4]);
		}
	}

	fs.writeFileSync("uc.jsons", JSON.stringify(ucArray, null, 4));
}

function cleanNumber(number) {
    // Remove all non-numeric characters
    let cleaned = number.replace(/\D/g, '');
    
    // Remove leading '0' if it exists
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
  
    return cleaned;
}

function cleanCnic(cnic) {
    // Remove all non-numeric characters
    let cleaned = cnic.replace(/\D/g, '');
  
    return cleaned;
}

function addUniqueEntry(arr, newEntry) {
	const isDuplicate = _.some(arr, (entry) => _.isEqual(entry, newEntry));

	if (!isDuplicate) {
		arr.push(newEntry);
		return arr;
	} else {
		return arr;
	}
}

function addUser(row, role, currentUC, currentTehsil) {
	const genderEnum = {
		f: "FEMALE",
		m: "MALE",
		male: "MALE",
		female: "FEMALE"
	};

	if (row[3] !== "") {
		currentTehsil = getClosestTehsil(row[3]);
	}

	if (row[4] !== "") {
		currentUC = `UC ${row[4]}`;
		if (row[5] !== "" && row[5] !== "-" ) currentUC += row[5];
		// currentUC = getClosestUC(currentUC);
	}

	const userObj = {
		firstName:
			role === "UCMO"
				? getFirstName(row[6])
				: role === "AIC"
				? getFirstName(row[10])
				: getFirstName(row[15]),
		lastName:
			role === "UCMO"
				? getLastName(row[6])
				: role === "AIC"
				? getLastName(row[10])
				: getLastName(row[15]),
		role: role,
		division: "Lahore",
		district: "Lahore",
		tehsil: currentTehsil,
		uc: currentUC,
		gender:
			role === "UCMO"
				? genderEnum[row[7].toLowerCase()]
				: role === "AIC"
				? genderEnum[row[11].toLowerCase()]
				: genderEnum[row[16].toLowerCase()],
		phone: role === "UCMO" ? cleanNumber(row[8]) : role === "AIC" ? cleanNumber(row[12]) : cleanNumber(row[17]),
		cnic: role === "UCMO" ? cleanCnic(row[9]) : role === "AIC" ? cleanCnic(row[13]) : cleanCnic(row[18]),
	};
	if (role === "UCMO") {
		userObj.aics = [];
	}
	if (role === "AIC") {
		userObj.flws = [];
	}
	if (role === "FLW") {
		userObj.teamNo = row[14];
	}
	return { user: userObj, currentUC, currentTehsil };
}

function validatePhone(number) {
    number = cleanNumber(number);
	return number.length === 10 && /^\d+$/.test(number) && number.startsWith("3");
}

function validateCNIC(cnic) {
    cnic = cleanCnic(cnic);
	return cnic.length === 13 && /^\d+$/.test(cnic);
}

function validateData(row, role) {
	const phone = role === "UCMO" ? row[8] : role === "AIC" ? row[12] : row[17];
	const cnic = role === "UCMO" ? row[9] : role === "AIC" ? row[13] : row[18];

	return validatePhone(phone) && validateCNIC(cnic);
}

async function superParser() {
	// const data = await csvTo2DArray("./csvfiles/ST.csv");
	const data = await dataFromAllFiles("./csvfiles/");

	let currentUCMO = {};
	let currentAIC = {};
	let currentUC = "";
	let currentTehsil = "";

	let skippedUsers = [];

	let badUCMOData = false;
	let badAICData = false;
	let badFLWData = false;

	let jsonArray = [];

	for (const [i, row] of data.entries()) {
		const { ucmoPresent, aicPresent, flwPresent } = analyzeRow(row);

        if(row)

        if(row[17]==="3520181182043"){
            console.log("Let's Go");
        }

		if (ucmoPresent) {
			badUCMOData = !validateData(row, "UCMO");

			if (badUCMOData) {
				skippedUsers = addUniqueEntry(skippedUsers, row);
				continue;
			}

			if (Object.keys(currentUCMO).length !== 0) {
				jsonArray.push(currentUCMO);
			}

			const addedData = addUser(row, "UCMO", currentUC, currentTehsil);
			currentUCMO = addedData.user;
			currentUC = addedData.currentUC;
			currentTehsil = addedData.currentTehsil;
		}

		if (aicPresent) {
			badAICData = !validateData(row, "AIC");

			if (badAICData || badUCMOData) {
				skippedUsers = addUniqueEntry(skippedUsers, row);
				continue;
			}

			const addedData = addUser(row, "AIC", currentUC, currentTehsil);
			currentAIC = addedData.user;
			currentUC = addedData.currentUC;
			currentTehsil = addedData.currentTehsil;

			currentAIC = addedData.user;
			currentUCMO.aics.push(addedData.user);
		}

		if (flwPresent) {
			badFLWData = !validateData(row, "FLW");
			if (badFLWData || badAICData || badUCMOData) {
				skippedUsers = addUniqueEntry(skippedUsers, row);
				continue;
			}

			const addedData = addUser(row, "FLW", currentUC, currentTehsil);
			currentUC = addedData.currentUC;
			currentTehsil = addedData.currentTehsil;

			currentAIC.flws.push(addedData.user);
		}

		if (i === data.length - 1) {
			jsonArray.push(currentUCMO);
		}
	}

	fs.writeFileSync("./results/bigboy.json", JSON.stringify(jsonArray, null, 2));
    fs.writeFileSync("./results/skipped2.json", JSON.stringify(skippedUsers, null, 1));
	fs.writeFileSync("./results/uc-matches.json", JSON.stringify(ucMatching, null, 1));
}

function analyzeRow(row) {
	let flags = { ucmoPresent: false, aicPresent: false, flwPresent: false };
	if (row[6] !== "") {
		flags.ucmoPresent = true;
	}
	if (row[10] !== "") {
		flags.aicPresent = true;
	}
	if (row[15] !== "") {
		flags.flwPresent = true;
	}

	return flags;
}

// ucparser();
// largeFileParser();
// smallFileParser();

superParser();
