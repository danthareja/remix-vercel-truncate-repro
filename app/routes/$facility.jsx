import { uniq, map, mapValues } from "lodash";
import { json } from "@vercel/remix";
import { db } from '~/db.server'

export async function loader({ params }) {
  const facility = await db.facility.findUnique({
    where: {
      slug: params.facility,
    },
    include: {
      sites: true,
      agency: {
        select: {
          name: true,
          scanner: true,
        },
      },
    },
  });

  if (!facility) {
    throw json({
      error: "Facility not found",
    });
  }

  return json({
    facility,
    ...getLoaderData(facility),
  });
}

const sortedFiltersBySiteType = {
  rv: [
    { value: "isAccessible", label: "Accessible", icon: "AccessibleIcon" },
    { value: "hasSewer", label: "Sewer", icon: "SewerIcon" },
    { value: "hasWater", label: "Water", icon: "WaterIcon" },
    { value: "hasElectric", label: "Electric", icon: "ElectricIcon" },
    {
      value: "isPullThrough",
      label: "Pull-Through Only",
      icon: "PullThroughIcon",
    },
    { value: "isDoubleSite", label: "Double Site", icon: "DoubleSiteIcon" },
  ],
  tent: [
    { value: "isAccessible", label: "Accessible", icon: "AccessibleIcon" },
    { value: "isTentOnly", label: "Tents Only", icon: "TentOnlyIcon" }, // client-side only
    { value: "isDoubleSite", label: "Double Site", icon: "DoubleSiteIcon" },
  ],
  // While site_type rv_tent does technically still exist,
  // It's not a valid client-side filter anymore
  //
  // Since we now select only either 'rv' or 'tent' on the client side
  // and merge rv_tent sites into each of the options
  //
  // This makes it easier for rv users to select against all sites
  // in one go, without having to select 'rv or tent' and 'rv only'
  //
  // rv_tent: [
  //   { value: "isAccessible", label: "Accessible", icon: "AccessibleIcon" },
  //   { value: "hasSewer", label: "Sewer", icon: "SewerIcon" },
  //   { value: "hasWater", label: "Water", icon: "WaterIcon" },
  //   { value: "hasElectric", label: "Electric", icon: "ElectricIcon" },
  //   {
  //     value: "isPullThrough",
  //     label: "Pull-Through Only",
  //     icon: "PullThroughIcon",
  //   },
  // ],
  backcountry: [
    { value: "isAccessible", label: "Accessible", icon: "AccessibleIcon" },
  ],
  group: [{ value: "isAccessible", label: "Accessible" }],
  lodging: [
    { value: "isAccessible", label: "Accessible", icon: "AccessibleIcon" },
  ],
  other: [],
};

const maxRVLengthOptions = [
  {
    value: "18", // BCParks/OntarioParks
    label: "Up to 18'",
  },
  {
    value: "20", // AlbertaParks
    label: "Up to 20'",
  },
  {
    value: "21", // ParksCanada
    label: "Up to 21'",
  },
  {
    value: "24", // ParksCanada
    label: "Up to 24'",
  },
  {
    value: "25", // OntarioParks
    label: "Up to 25'",
  },
  {
    value: "27", // ParksCanada
    label: "Up to 27'",
  },
  {
    value: "30", // ParksCanada/AlbertaParks
    label: "Up to 30'",
  },
  {
    value: "32", // BCParks/OntarioParks
    label: "Up to 32'",
  },
  {
    value: "33", // BCParks/OntarioParks
    label: "Over 32'",
  },
  {
    value: "35", // ParksCanada
    label: "Up to 35'",
  },
  {
    value: "36", // ParksCanada
    label: "Over 35'",
  },
  {
    value: "40", // AlbertaParks
    label: "Up to 40'",
  },
  {
    value: "50", // AlbertaParks
    label: "Up to 50'",
  },
  {
    value: "60", // AlbertaParks
    label: "Up to 60'",
  },
  {
    value: "61", // AlbertaParks
    label: "Over 60'",
  },
];

const maxElectricOptions = [
  {
    value: "15",
    label: "15 Amps",
  },
  {
    value: "20",
    label: "20 Amps",
  },
  {
    value: "30",
    label: "30 Amps",
  },
  {
    value: "50",
    label: "50 Amps",
  },
];

const sortedSiteTypes = [
  { value: "rv", label: "RV" },
  { value: "tent", label: "Tent" },
  // While site_type rv_tent does technically still exist,
  // It's not a valid client-side filter anymore
  //
  // Since we now select only either 'rv' or 'tent' on the client side
  // and merge rv_tent sites into each of the options
  //
  // This makes it easier for rv users to select against all sites
  // in one go, without having to select 'rv or tent' and 'rv only'
  //
  // { value: "rv_tent", label: "RV or Tent" },
  { value: "backcountry", label: "Backcountry" },
  { value: "lodging", label: "Lodging" },
  { value: "group", label: "Group" },
  { value: "other", label: "Other" },
];


function getLoaderData(facility) {
  const facilitySiteTypes = uniq(map(facility.sites, "type"));

  const siteTypes = sortedSiteTypes.filter((sorted) => {
    // On the client,
    // 'rv' should include 'rv' and 'rv_tent' options
    // 'tent' should include 'tent' and 'rv_tent' options
    if (sorted.value === "rv") {
      return (
        facilitySiteTypes.includes("rv") ||
        facilitySiteTypes.includes("rv_tent")
      );
    }
    if (sorted.value === "tent") {
      return (
        facilitySiteTypes.includes("tent") ||
        facilitySiteTypes.includes("rv_tent")
      );
    }
    return facilitySiteTypes.includes(sorted.value);
  });

  // reduce the chance that the selected option will have no sites
  const siteFilters = mapValues(sortedFiltersBySiteType, (options, type) => {
    return options.filter((option) => {
      return facility.sites
        .filter((site) => {
          // client-side only filter
          // really this means type === 'tent'
          if (type === "rv" || type === "tent") {
            return site.type.includes(type);
          }
          return site.type === type;
        })
        .some((site) => {
          // client-side only filter
          // really this means type === 'tent'
          if (option.value === "isTentOnly") {
            return site.type === "tent";
          }

          return site[option.value];
        });
    });
  });

  // reduce the chance that the selected option will have no sites
  const maxRVLengthFilters = maxRVLengthOptions.filter((option) => {
    return facility.sites
      .filter((site) => site.maxRVLength)
      .some((site) => site.maxRVLength == parseInt(option.value));
  });

  // reduce the chance that the selected option will have no sites
  const maxElectricFilters = maxElectricOptions.filter((option) => {
    return facility.sites
      .filter((site) => site.hasElectric && site.maxElectric)
      .some((site) => site.maxElectric == parseInt(option.value));
  });

  return {
    siteTypes,
    siteFilters,
    maxRVLengthFilters,
    maxElectricFilters,
  };
}