import * as fs from 'fs/promises';
import * as d3 from 'd3';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const OUT_PATH_HTML = './static/assets/data/guttmacher/html';
const OUT_PATH_TABLES = './static/assets/data/guttmacher/tables';

const urls = [
    "abortion-bans-cases-sex-or-race-selection-or-genetic-anomaly",
    "bans-specific-abortion-methods-used-after-first-trimester"
];
const states = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming"
]

let data = [];

function checkX1(string) {
    if (string == "X") { return "yes"}
    else if (string == "") { return "no"}
    else if (string == "▼") { return "Enforcement permanently enjoined by court order; policy not in effect."}
    else if (string == "▼*") { return "Enforcement permanently enjoined by court order; policy not in effect. Illinois's ban applies after viability; in 1993, a federal court enjoined the portion of the bill that applies before viability."}
    else if (string == "†") { return "Minnesota and Oklahoma require counseling on perinatal hospice services if an abortion is sought due to a lethal fetal abnormality. Arizona requires counseling about perinatal hospice services if an abortion is sought due to a lethal fetal abnormality, as well as counseling on outcomes for those living with the condition that the fetus is diagnosed with if the abortion is sought for a nonlethal fetal condition. Kansas requires counseling on perinatal hospice services before all abortions."}
    else if (string == "‡") { return "Utah's ban will only take effect if a court decision allows states to ban abortion in these cases."}
    else if (string == "s") { return "Law is temporarily enjoined, policy is not in effect."}
    else { return "NA"}
}

function checkX2(string) {
    if (string == "X") { return "yes"}
    if (string == "X*") { return "yes. Law applies after viability."}
    else if (string == "X*,‡") { return "yes. Law applies after viability.  The health exception only applies to severe physical health conditions."}
    else if (string == "X‡") { return "yes. The health exception only applies to severe physical health conditions."}
    else if (string == "") { return "no"}
    else if (string == "▼") { return "Permanently enjoined by court order; law not in effect."}
    else if (string == "§") { return "Temporarily enjoined by court order; law not in effect."}
    else if (string == "*") { return "Law applies after viability."}
    else if (string == "‡") { return "The health exception only applies to severe physical health conditions."}
    else if (string == "†") { return "This policy is presumably unenforceable under the terms set out in Stenberg v. Carhart; however, it has not been challenged in court."}
    else if (string == "†*") { return "This policy is presumably unenforceable under the terms set out in Stenberg v. Carhart; however, it has not been challenged in court. Law applies after viability."}
    else if (string == "s") { return "Law is temporarily enjoined, policy is not in effect."}
    else { return "NA"}
}

async function getTablesHTML(endURL) {
    const url = `https://www.guttmacher.org/state-policy/explore/${endURL}/`;
    console.log(url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const html = await response.text();
        await fs.writeFile(`${OUT_PATH_HTML}/${endURL}.html`, html);
    } catch (error) {
        console.error(error);
    }
}

async function getTables(endURL) {
    try {
        const file = await fs.readFile(`${OUT_PATH_HTML}/${endURL}.html`, 'utf-8');
        const $ = cheerio.load(file);
        // Additional processing with cheerio can be done here

        if (endURL == "abortion-bans-cases-sex-or-race-selection-or-genetic-anomaly") {
            $(".WordSection1 table tr")
            .each((i, el) => {
                const stateName = $(el)
                    .find('td:first')
                    .text();
                const policy_sexSelection = $(el)
                    .find('td:nth-child(2)')
                    .text();
                const policy_raceSelection = $(el)
                    .find('td:nth-child(3)')
                    .text();
                const policy_geneticAnomaly = $(el)
                    .find('td:nth-child(4)')
                    .text();
                
                if (states.includes(stateName.trim())) data.push({
                    stateName: stateName.trim(), 
                    policy_sexSelection: checkX1(policy_sexSelection.trim()),
                    policy_raceSelection: checkX1(policy_raceSelection.trim()),
                    policy_geneticAnomaly: checkX1(policy_geneticAnomaly.trim()),
                })

                const concatData = [].concat(...data).map(d => ({ ...d }));
                const csvData = d3.csvFormat(concatData);
                fs.writeFile(`${OUT_PATH_TABLES}/${endURL}.csv`, csvData);
            })
        }

        if (endURL == "bans-specific-abortion-methods-used-after-first-trimester") {
            $(".WordSection1 table tr")
            .each((i, el) => {
                const stateName = $(el)
                    .find('td:first')
                    .text();
                const policy_dialationBanned = $(el)
                    .find('td:nth-child(2)')
                    .text();
                const policy_dialationException = $(el)
                    .find('td:nth-child(3)')
                    .text();
                const policy_partialBirthBanned = $(el)
                    .find('td:nth-child(4)')
                    .text();
                const policy_partialBirthHealthException = $(el)
                    .find('td:nth-child(5)')
                    .text();
                const policy_partialBirthLifeException = $(el)
                    .find('td:nth-child(6)')
                    .text();
                
                if (states.includes(stateName.trim())) data.push({
                    stateName: stateName.trim(), 
                    policy_dialationBanned: checkX2(policy_dialationBanned.trim()),
                    policy_dialationException: checkX2(policy_dialationException.trim()),
                    policy_partialBirthBanned: checkX2(policy_partialBirthBanned.trim()),
                    policy_partialBirthHealthException: checkX2(policy_partialBirthHealthException.trim()),
                    policy_partialBirthLifeException: checkX2(policy_partialBirthLifeException.trim())
                })

                const concatData = [].concat(...data).map(d => ({ ...d }));
                const csvData = d3.csvFormat(concatData);
                fs.writeFile(`${OUT_PATH_TABLES}/${endURL}.csv`, csvData);
            })
        }
    } catch (error) {
        console.error(`Error reading or processing file ${endURL}.html:`, error);
    }
}

async function init() {
    // await fs.mkdir(OUT_PATH, { recursive: true }); // Ensure the output directory exists
    // const fetchPromises = urls.map(getTablesHTML);
    // await Promise.all(fetchPromises);

    const tablePromises = urls.map(getTables);
    await Promise.all(tablePromises);
    console.log(data)
}
  

init();