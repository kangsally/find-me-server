exports.getDistance = (myLat, myLng, partnerLat, partnerLng) => {
  const earthRadius = 6371;
  const distance =
    Math.acos(
      Math.sin(myLat) * Math.sin(partnerLat) +
        Math.cos(myLat) * Math.cos(partnerLat) * Math.cos(myLng - partnerLng)
    ) * earthRadius;

  return distance;
};
