exports.getDistance = (myLat, myLon, partnerLat, partnerLon) => {
  const earthRadius = 6371;
  const distance =
    Math.acos(
      Math.sin(myLat) * Math.sin(partnerLat) +
        Math.cos(myLat) * Math.cos(partnerLat) * Math.cos(myLon - partnerLon)
    ) * earthRadius;

  return distance;
};
