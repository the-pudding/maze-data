import * as fs from 'fs/promises';
import * as d3 from 'd3';
const OUT_PATH = './static/assets/data/guttmacher/';

async function fetchLiveData() {
  let policyData = [];
  let legislationData = [];

  // Gets the json from the URL, saves as response and then loops through the data to get what we need
  async function getJSON(url, dataType) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      loopData(data, dataType);
    } catch (error) {
      console.error("Error fetching and downloading JSON:", error);
    }
  }

  // Loops through the data and structures it the way we need it
  function loopData(data, dataType) {
    if (dataType === "policy") {
      policyData = data.entries.map((d, i) => ({
        state: d.state,
        policy: d.environment_type,
        banType: d.filters[0].filter_title,
        abortions: d.abortions_obtained_in_2017,
        abortionsPerThousandWomen: d.abortions_per_1000_women_aged_15_44_in_2017,
        abortionClinics: d.clinics_provided_abortion_in_2017,
        percentCountiesNoProvider: d.counties_without_abortion_provider_in_2017,
        drivingDistanceAfter24weeks: d.aowdd_15_49_after_24_weeks
      }));
    } else {
      legislationData = summarizeStates(data.rows);
      console.log(legislationData)
    }
  }

  // Counts up unique states
//   function countStates(data) {
//     const stateCount = {};
//     let totalCount = 0;

//     data.forEach((d) => {
//       const state = d.value.state;
//       if (stateCount[state]) {
//         stateCount[state]++;
//       } else {
//         stateCount[state] = 1;
//       }
//       totalCount++;
//     });

//     stateCount["US"] = totalCount;
//     return stateCount;
//   }

  function summarizeStates(data) {
    const stateSummary = data.reduce((acc, obj) => {
        const state = obj.value.state;
        const name = obj.value.name;

        if (!acc[state]) {
            acc[state] = {};
        }

        if (!acc[state][name]) {
            acc[state][name] = 0;
        }
        acc[state][name]++

        return acc;
    }, {});

    return stateSummary;
  }
  
  // Calls the functions!!
  await getJSON(
    "https://states.guttmacher.org/policies/admin/api/collections/get/states/?populate=1",
    "policy"
  );
  await getJSON(
    "https://couchdb.guttmacher.org/guttmacher/_design/policy_updates/_view/year_topic?startkey=%5B2023%2C%22Abortion%22%5D&endkey=%5B2024%2C%22Abortion%22%2C%7B%7D%5D",
    "legislation"
  );
  
  // POLICY CSV
  const concatPolicyData = [].concat(...policyData).map(d => ({ ...d }));
  const csvPolicyData = d3.csvFormat(concatPolicyData);
  fs.writeFile(`${OUT_PATH}/policyData.csv`, csvPolicyData);

  // LEGISLATION CSV
  const uniqueNames = new Set();
    for (const state in legislationData) {
        for (const policy in legislationData[state]) {
            uniqueNames.add(policy);
        }
    }
    
const uniqueNamesArray = Array.from(uniqueNames);
let csvLegislationContent = 'State,' + uniqueNamesArray.join(',') + '\n';

for (const state in legislationData) {
    const row = [state];
    uniqueNamesArray.forEach(name => {
      row.push(legislationData[state][name] || 0); // Use 0 if the count doesn't exist
    });
    csvLegislationContent += row.join(',') + '\n';
  }

  fs.writeFile(`${OUT_PATH}/legislationData.csv`, csvLegislationContent);
}

fetchLiveData()