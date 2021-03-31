import { request, gql } from "graphql-request";
import { Command } from "commander";
import * as fs from "fs";
import * as notifier from "node-notifier";
const program = new Command();

program
  .requiredOption("--latitude <value>", "latitude")
  .requiredOption("--longitude <value>", "longitude")
  .option("--mock", "mock");

program.parse();
const latitudeStr = program.opts().latitude;
const longitudeStr = program.opts().longitude;
const MOCK = program.opts().mock;

function sleep(ms: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

const query = gql`
  query SearchPharmaciesNearPointWithCovidVaccineAvailability(
    $latitude: Float!
    $longitude: Float!
    $radius: Int! = 10
  ) {
    searchPharmaciesNearPoint(
      latitude: $latitude
      longitude: $longitude
      radius: $radius
    ) {
      distance
      location {
        locationId
        name
        nickname
        phoneNumber
        businessCode
        isCovidVaccineAvailable
        covidVaccineEligibilityTerms
        address {
          line1
          line2
          city
          state
          zip
          latitude
          longitude
        }
      }
    }
  }
`;

function getVaccineAppointmentInformation(latitude: string, longitude: string) {
  if (MOCK) {
    console.info(
      `[MOCK] Checking for available vaccine appointments at coordinates [${latitudeStr},${longitudeStr}]`
    );

    return Promise.resolve(
      JSON.parse(fs.readFileSync("mock.json", { encoding: "utf-8" }))
    );
  }

  console.info(
    `Checking for available vaccine appointments at coordinates [${latitudeStr},${longitudeStr}]`
  );

  return request("https://www.hy-vee.com/my-pharmacy/api/graphql", query, {
    radius: 10,
    latitude: parseFloat(latitudeStr),
    longitude: parseFloat(longitudeStr),
  });
}

async function run() {
  while (true) {
    getVaccineAppointmentInformation(latitudeStr, longitudeStr)
      .then((response) => {
        const locations: {
          name: string;
          nickname: string;
          isCovidVaccineAvailable: boolean;
          covidVaccineEligibilityTerms: string;
        }[] = response.searchPharmaciesNearPoint.map(({ location }) => ({
          name: location.name,
          nickname: location.nickname,
          isCovidVaccineAvailable: location.isCovidVaccineAvailable,
          covidVaccineEligibilityTerms: location.covidVaccineEligibilityTerms,
        }));

        console.table(
          locations.sort((a, b) => {
            if (a.name > b.name) {
              return 1;
            }

            if (a.name < b.name) {
              return -1;
            }

            return 0;
          })
        );

        const vaccinesAvailable = locations.some(
          (l) => l.isCovidVaccineAvailable
        );
        if (vaccinesAvailable) {
          const availableLocations = locations
            .filter((al) => al.isCovidVaccineAvailable)
            .map((al) => al.nickname)
            .join("\n");

          notifier.notify(
            {
              title: `Vaccine Appointments Available`,
              message: `Vaccine appointments are available at ${availableLocations}`,
              open: "https://www.hy-vee.com/my-pharmacy/covid-vaccine-consent",
            },
            (err) => {
              if (err) {
                console.error(`Error sending notification`);
                console.error(err);
              }

              process.exit(0);
            }
          );
        } else {
          console.info(
            `No vaccine appointments available. Checking again in 60 seconds.`
          );
        }
      })
      .catch((err) => {
        console.error(err);
      });

    await sleep(60000);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
