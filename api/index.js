const axios = require('axios');

const api = axios.create({
  headers: {
    Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}`
  }
});

exports.getFacilityLocation = async (lng, lat, category) => {
  try {
    const response = await api.get(
      `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${category}&y=${lat}&x=${lng}&radius=${1000}&page=${1}&sort=distance`
    );
    if (response.status === 200) {
      return response.data.documents[0];
    }
  } catch (error) {
    console.log(error);
  }
};
