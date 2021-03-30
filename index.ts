import { request, gql } from "graphql-request";
import { Command } from "commander";

const program = new Command();

program
  .requiredOption("--latitude <value>", "latitude")
  .requiredOption("--longitude <value>", "longitude");

program.parse();
const latitudeStr = program.opts().latitude;
const longitudeStr = program.opts().longitude;

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

request("https://www.hy-vee.com/my-pharmacy/api/graphql", query, {
  radius: 10,
  latitude: parseFloat(latitudeStr),
  longitude: parseFloat(longitudeStr),
})
  .then((response) => {
    const locations = response.searchPharmaciesNearPoint.map(
      ({ location }) => ({
        name: location.name,
        nickname: location.nickname,
        isCovidVaccineAvailable: location.isCovidVaccineAvailable,
        covidVaccineEligibilityTerms: location.covidVaccineEligibilityTerms,
      })
    );

    console.log(locations);
  })
  .catch((err) => {
    console.error(err);
  });
