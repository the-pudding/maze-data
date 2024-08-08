import * as fs from 'fs/promises';
import * as d3 from 'd3';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const OUT_PATH_HTML = './static/assets/data/guttmacher/html';
const OUT_PATH_TABLES = './static/assets/data/guttmacher/tables';

const urls = [
    "abortion-bans-cases-sex-or-race-selection-or-genetic-anomaly",
    "bans-specific-abortion-methods-used-after-first-trimester",
    "counseling-and-waiting-periods-abortion"
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

function checkX3(string) {
    console.log(string)
    if (!isNaN(string)) { return string }
    else if (string == "▼") { return "Permanently enjoined by court order; policy not in effect."}
    else if (string == "24s") { return "24. Temporarily enjoined; policy not in effect. (In Louisiana, enforcement of a 72-hour waiting period is blocked; the 24-hour waiting period remains in effect.)"}
    else if (string.includes("72Ω")) { return "72. The law prohibits the inclusion of weekends and annual state holidays as part of the waiting period."}
    else if (string == "X") { return "yes"}
    else if (string == "Xξ​​") { return "yes. In-person counseling is not required for patients who live more than 100 miles from an abortion provider."}
    else if (string == "XЭ") { return "yes. In Kentucky, a patient may be able to use telemedicine for abortion counseling. In Utah, a patient may obtain abortion counseling in person at any medical office in the state."}
    else if (string == "Given" || string == "Offered") { return string.toLowerCase()}
    else if (string == "X") { return "yes"}
    else if (string == "V") { return "verbal counseling"}
    else if (string == "W") { return "written materials"}
    else if (string == "W*") { return "written materials. Included in written counseling materials although not specifically mandated by state law."}
    else if (string == "V,W") { return "verbal counseling, written materials"}
    else if (string == "V†​,W") { return "verbal counseling, written materials. Information given only to patients who are at 20 weeks of pregnancy or later; in Missouri, the law applies starting at 16 weeks of pregnancy. In Utah, a physician may waive the requirement if the abortion is because of rape, incest, life endangerment, a severe health problem or if the fetus has a lethal condition."}
    else if (string == "V‡") { return "verbal counseling. In Indiana, the provision is not enforced against Planned Parenthood of Indiana due to a court case."}
    else if (string == "W†​") { return "written materials. Information given only to patients who are at 20 weeks of pregnancy or later; in Missouri, the law applies starting at 16 weeks of pregnancy. In Utah, a physician may waive the requirement if the abortion is because of rape, incest, life endangerment, a severe health problem or if the fetus has a lethal condition."}
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
            data = [];
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
            data = [];
        }

        if (endURL == "counseling-and-waiting-periods-abortion") {
            $(".WordSection1 table:first tr")
            .each((i, el) => {
                const stateName = $(el)
                    .find('td:first')
                    .text();
                const policy_waitingPeriodHours = $(el)
                    .find('td:nth-child(2)')
                    .text();
                const policy_twoInPersonTrips = $(el)
                    .find('td:nth-child(3)')
                    .text();
                const policy_writtenMaterials = $(el)
                    .find('td:nth-child(4)')
                    .text();
                const policy_informedCoercion = $(el)
                    .find('td:nth-child(5)')
                    .text();
                const policy_specificDescription = $(el)
                    .find('td:nth-child(6)')
                    .text();
                const policy_commonDescription = $(el)
                    .find('td:nth-child(7)')
                    .text();
                const policy_gestationalAge = $(el)
                    .find('td:nth-child(8)')
                    .text();
                const policy_throughoutPregnacy = $(el)
                    .find('td:nth-child(9)')
                    .text();
                const policy_fetalPain = $(el)
                    .find('td:nth-child(10)')
                    .text();
                const policy_personhood = $(el)
                    .find('td:nth-child(11)')
                    .text();
                
                if (states.includes(stateName.replace(/[^\w\s]/g, '').trim())) data.push({
                    stateName: stateName.replace(/[^\w\s]/g, '').trim(), 
                    policy_waitingPeriodHours: checkX3(policy_waitingPeriodHours.trim()),
                    policy_twoInPersonTrips: checkX3(policy_twoInPersonTrips.trim()),
                    policy_writtenMaterials: checkX3(policy_writtenMaterials.trim()),
                    policy_informedCoercion: checkX3(policy_informedCoercion.trim()),
                    policy_specificDescription: checkX3(policy_specificDescription.trim()),
                    policy_commonDescription: checkX3(policy_commonDescription.trim()),
                    policy_gestationalAge: checkX3(policy_gestationalAge.trim()),
                    policy_throughoutPregnacy: checkX3(policy_throughoutPregnacy.trim()),
                    policy_fetalPain: checkX3(policy_fetalPain.trim()),
                    policy_personhood: checkX3(policy_personhood.trim())
                })

                const concatData = [].concat(...data).map(d => ({ ...d }));
                const csvData = d3.csvFormat(concatData);
                fs.writeFile(`${OUT_PATH_TABLES}/${endURL}.csv`, csvData);
            })
            data = [];
        }
    } catch (error) {
        console.error(`Error reading or processing file ${endURL}.html:`, error);
    }
}

async function init() {
    // await fs.mkdir(OUT_PATH_HTML, { recursive: true }); // Ensure the output directory exists
    // const fetchPromises = urls.map(getTablesHTML);
    // await Promise.all(fetchPromises);

    const tablePromises = urls.map(getTables);
    await Promise.all(tablePromises);
}
  

init();