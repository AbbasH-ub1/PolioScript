const {connectToDatabase, disconnectFromDatabase} = require("./db-connection");
const User = require("./schemastuff/users.schema");
const TehsilTown = require ("./schemastuff/tehsiltown.schema");
const Team = require("./schemastuff/teams.schema");
const UC = require("./schemastuff/uc.schema");
const fs = require("fs");
const bcrypt = require("bcrypt");

let addedUsers = [];



function generateRandomEmail(firstName) {
	const characters = "abcdefghijklmnopqrstuvwxyz0123456789";

	let randomString = "";

	for (let i = 0; i < 5; i++) {
		randomString += characters.charAt(
			Math.floor(Math.random() * characters.length)
		);
	}

	return `${firstName.trim()}-${randomString}@poliopulse.com`;
}

async function validateUserData(data) {
	let resultString = "";

	const emailExist = await User.findOne({ email: data.email });
	if (emailExist) resultString += "Email already exists";

	const cnicExist = await User.findOne({ cnic: data.cnic });
	if (cnicExist) resultString += " cnic Already exists";

	if (resultString !== "") {
		console.log(resultString);
		return true;
	} else {
		return false;
	}
}

async function start() {
	await connectToDatabase();

	const userData = JSON.parse(fs.readFileSync("./results/bigboy.json"));
	let teamTracker = [];

	for (row of userData) {
		let currentTeams = [];
		let currentTeamNumbers = [];
		

		const ucmoData = {
			firstName: row.firstName,
			lastName: row.lastName,
			cnic: row.cnic,
			phone: row.phone,
			gender: row.gender,
			role: row.role,
			email: generateRandomEmail(row.firstName),
		};

		const existingData = await validateUserData(ucmoData);

		if (existingData) {
			console.log("Skipping " + row.firstName + " " + row.role + " " + row.cnic);
			continue;
		}

		const generatedPassword = "polio12356";

		ucmoData.password = await bcrypt.hash(
			generatedPassword,
			await bcrypt.genSalt(10)
		);

        addedUsers.push({firstName: ucmoData.firstName, role: ucmoData.role, cnic: ucmoData.cnic, password: generatedPassword});

		const user = new User(ucmoData);
		const data = await user.save();

		const currentUCMOId = data._id;

		aicArray = [];
		aicNames = [];
        flwArray = [];

		for (aic of row.aics) {
			const aicData = {
				firstName: aic.firstName,
				lastName: aic.lastName,
				cnic: aic.cnic,
				phone: aic.phone,
				gender: aic.gender,
				role: aic.role,
				email: generateRandomEmail(row.firstName),
				ucmo: currentUCMOId,
			};

			const existingData = await validateUserData(aicData);

			if (existingData) {
				console.log("Skipping " + aic.firstName + " " + aic.role + " " + + aic.cnic);
				continue;
			}

			const generatedPassword = "polio12356";

			aicData.password = await bcrypt.hash(
				generatedPassword,
				await bcrypt.genSalt(10)
			);

            addedUsers.push({firstName: aicData.firstName, role: aicData.role, cnic: aicData.cnic, password: generatedPassword});

			const user = new User(aicData);
			const data = await user.save();

			const currentAicId = data._id;

			for (flw of aic.flws) {
				const flwData = {
					firstName: flw.firstName,
					lastName: flw.lastName,
					cnic: flw.cnic,
					phone: flw.phone,
					gender: flw.gender,
					role: flw.role,
					email: generateRandomEmail(flw.firstName),
					ucmo: currentUCMOId,
					aic: currentAicId,
				};
				const existingData = await validateUserData(flwData);

				if (existingData) {
					console.log("Skipping " + flw.firstName + " " + flw.role + " " + flw.cnic);
					continue;
				}

				const generatedPassword = "polio12356";

				flwData.password = await bcrypt.hash(
					generatedPassword,
					await bcrypt.genSalt(10)
				);
                addedUsers.push({firstName: flwData.firstName, role: flwData.role, cnic: flwData.cnic, password: generatedPassword});
                flwArray.push(flwData);

				const teamObj = {
					teamName: `${flw.uc}-${flw.teamNo}`, 
					teamNumber: Number.parseInt(flw.teamNo), 
					ucmo: currentUCMOId, 
					aic: currentAicId,
					territory: {
						district:flw.district,
						division:flw.division,
						uc: flw.uc,
						tehsilOrTown: flw.tehsil
					}
				}

				
				if(!currentTeamNumbers.includes(teamObj.teamNumber)){
					
					currentTeamNumbers.push(teamObj.teamNumber);

					currentTeams.push(teamObj);
	
					teamTracker.push({
						ucmo: `${ucmoData.firstName} ${ucmoData.lastName}`,
						aic: `${aicData.firstName} ${aicData.lastName}`,
						flw: `${flwData.firstName} ${flwData.lastName}`,
						teamName: teamObj.teamName,
						teamNumber: teamObj.teamNumber,
						territory: teamObj.territory
					});
				}
			}

            try {
                const newUsers = await User.insertMany(flwArray);
				currentTeams.forEach((team, index)=>{
					team.flws = [];
					team.flws.push(newUsers[index]._id);
				});

				await Team.insertMany(currentTeams);
            } catch (error) {
                console.log(error);
            }

            flwArray = [];
			currentTeams = [];
			currentTeamNumbers = [];


			// aicArray.push(aicData);
			// aicNames.push(aicData.firstName);
		}

		// await User.insertMany(aicArray);
		// console.log("AICs added: ", ...aicNames);
	}

    fs.writeFileSync("./results/added-users-6.json", JSON.stringify(addedUsers, null, 4));
	fs.writeFileSync("./results/added-teams-6.json", JSON.stringify(teamTracker, null, 4));

	console.log("All users added.");
	disconnectFromDatabase();
}

async function passHash(){
    const password = await bcrypt.hash(
        "polio12356",
        await bcrypt.genSalt(10)
    );

    console.log(password);

    fs.writeFileSync("password.json", JSON.stringify({storedPassword: password}));
}

async function compare(){
    const password = "polio12356";

    pwData = JSON.parse(fs.readFileSync("password.json"));

    storedPassword = pwData.storedPassword;

    console.log(await bcrypt.compare(password, storedPassword));
}

async function getTehsils(){
	await connectToDatabase();
	const tehsils = await TehsilTown.find({}, {name:1, _id:1});
	tehsilArray = [];
	for(t of tehsils){
		t.opName = t.name.replace(/TOWN/, "").trim();
		const newObj = {
			name: t.name,
			opName: t.opName.toLowerCase(),
			_id: t._id
		}
		tehsilArray.push(newObj);
	}

	console.log(tehsilArray);
	fs.writeFileSync("./db-refs/tehsils.json", JSON.stringify(tehsilArray, null, 4));

	disconnectFromDatabase();
}

async function getUCs(){
	await connectToDatabase();
	const ucs = await UC.find({}, {name:1, _id:1});
	const ucNames = ucs.map(uc => {
		return {
			name: uc.name,
			_id:uc._id
		}
	});

	// console.log(ucNames);

	fs.writeFileSync("./db-refs/ucs.json", JSON.stringify(ucNames, null, 4));
	disconnectFromDatabase();
}

// passHash();
// compare();

start();

// getTehsils();

// getUCs();


