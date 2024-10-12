const fs = require('fs');
const csv = require('csv-parser');

let json = [];

function formatUCString(str) {

    if(str.length>3){
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
    
    
    str = str.replace(/\(.*?\)/g, '');
    str = str.replace(/([a-zA-Z])\1/g, '$1');

    if (!/^[a-zA-Z]/.test(str)) {
        str = "UC " + str;
    }

    return str.trim();
}

function getFirstName(name){
    const indexOfLastSpace = name.lastIndexOf(" ");
    return name.slice(0, indexOfLastSpace);
}

function getLastName(name){
    const indexOfLastSpace = name.lastIndexOf(" ");
    return name.slice(indexOfLastSpace+1, name.length);
}

function csvTo2DArray(filePath) {
  const rows = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({headers:false}))
      .on('data', (row) => {
        rows.push(Object.values(row)); // Convert each row object to an array of values
      })
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });
}

async function nice(){
    const data = await csvTo2DArray("importantsheet.csv");

    let currentUCMO = {};

    for(const [i, row] of data.entries()){
        if(row[6]!=="-"){
            if(i!==0){
                json.push(currentUCMO);
            }
            currentUCMO = {};

            obj = {
                sr: row[0],
                division: row[1],
                district: row[2],
                townOrTehsil: row[3],
                uc: formatUCString(row[4]+row[5]),
                firstName: getFirstName(row[6]),
                lastName: getLastName(row[6]),
                role: "UCMO",
                gender: row[7] === "M" ? "MALE" : "FEMALE",
                phone: `0${row[8]}`,
                CNIC: row[9],
                aics: [{
                    sr: row[0],
                    division: row[1],
                    district: row[2],
                    townOrTehsil: row[3],
                    uc: formatUCString(row[4]+row[5]),
                    firstName: getFirstName(row[10]),
                    lastName: getLastName(row[10]),
                    role: "AIC",
                    gender: row[11] === "M" ? "MALE" : "FEMALE",
                    phone: `0${row[12]}`,
                    CNIC: row[13]
                }]
            }
            currentUCMO = obj;
        } else {
            const aicUC = formatUCString(row[4]+row[5])=="UC" ? currentUCMO.uc : formatUCString(row[4]+row[5])
            aicObj = {
                sr: row[0],
                division: row[1],
                district: row[2],
                townOrTehsil: row[3],
                uc: aicUC,
                firstName: getFirstName(row[10]),
                lastName: getLastName(row[10]),
                role: "AIC",
                gender: row[11] === "M" ? "MALE" : "FEMALE",
                phone: `0${row[12]}`,
                CNIC: row[13]
            }
            currentUCMO.aics.push(aicObj);

            if(i === data.length-1){
                json.push(currentUCMO);
            }
        }

        
    }

    fs.writeFileSync("wowitworked.json", JSON.stringify(json, null, 2))

    // let seenUCs = [];

    // for(row of json){
    //     if(!seenUCs.includes(row.uc)){

    //         console.log(`${row.sr}: ${row.uc}`)
    //         seenUCs.push(row.uc)
    //     }
    // }
}

nice();
