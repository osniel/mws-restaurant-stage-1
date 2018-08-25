
/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static get REVIEWS_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/reviews`;
  }

  static openRestaurantsDB() {
    return idb.open('restaurants-db', 3, function(upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0: 
          if (!upgradeDb.objectStoreNames.contains('restaurants')) {
            upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
          }
        case 1:
          if (!upgradeDb.objectStoreNames.contains('pending-reviews')) {
            upgradeDb.createObjectStore('pending-reviews', {keyPath: 'date'});
          }
        case 2:
          if (!upgradeDb.objectStoreNames.contains('pending-favorite')) {
            upgradeDb.createObjectStore('pending-favorite', { keyPath: "id"});
          }
      }
    });
  }

  static savePendingReview(review) {
    if (!review)
      return review;
    
    if (!('indexedDB' in window)) {
      return review;
    }

    var dbPromise = DBHelper.openRestaurantsDB();

    return dbPromise.then(function(db) {
      var tx = db.transaction('pending-reviews', 'readwrite');
      var store = tx.objectStore('pending-reviews');
      store.put({
        date : review.createdAt,
        data : review
      });
      return tx.complete;
    })
    .then(function(result) {
      return review;
    });
  }

  static addReviewToRestaurant(review) {
    if (!review)
      return review;
    
    if (!('indexedDB' in window)) {
      return review;
    }

    var dbPromise = DBHelper.openRestaurantsDB();

    return dbPromise.then(function(db) {
      var tx = db.transaction('restaurants', 'readwrite');
      var store = tx.objectStore('restaurants');
      
      return store.get(review.restaurant_id);
    })
    .then(function(restaurantData) {
      var restaurant = restaurantData.data;
      var reviews = restaurant.reviews;
      reviews.push(review);
      restaurant.reviews = reviews;
      return DBHelper.saveRestaurantData(restaurant);
    })
    .then(function(result) {
      return review;
    })
    .catch(function(error) {
      return review;
    });
  }

  static popPendingReviews() {
    if (!('indexedDB' in window)) {
      return [];
    }
    
    var dbPromise = DBHelper.openRestaurantsDB();
    var tx;
    var store;
    var reviews = [];

    return dbPromise.then(function(db) {
      tx = db.transaction('pending-reviews', 'readwrite');
      store = tx.objectStore('pending-reviews');
      
      return store.getAll();
    }).then(function(dbData) {
      if (!dbData || dbData.length === 0) {
        return dbData;
      }
      return dbData.map(current => current.data);
    }).then(mappedData => {
      reviews = mappedData;
      
      store.clear();
      return tx.complete;
    }).then(result => {
      return reviews;
    }).catch(error => {
      return [];
    });
  }

  static savePendingFavorite(restaurant) {
    if (!restaurant)
      return restaurant;
    
    if (!('indexedDB' in window)) {
      return restaurant;
    }

    var dbPromise = DBHelper.openRestaurantsDB();

    return dbPromise.then(function(db) {
      var tx = db.transaction('pending-favorite', 'readwrite');
      var store = tx.objectStore('pending-favorite');
      store.put({
        id : restaurant.id,
        data : restaurant
      });
      return tx.complete;
    })
    .then(function(result) {
      return restaurant;
    })
    .catch(function(error) {
      return restaurant;
    });
  }

  static popPendingFavorites() {
    if (!('indexedDB' in window)) {
      return [];
    }
    
    var dbPromise = DBHelper.openRestaurantsDB();
    var tx;
    var store;
    var results = [];

    return dbPromise.then(function(db) {
      tx = db.transaction('pending-favorite', 'readwrite');
      store = tx.objectStore('pending-favorite');
      
      return store.getAll();
    }).then(function(dbData) {
      if (!dbData || dbData.length === 0) {
        return dbData;
      }
      return dbData.map(current => current.data);
    }).then(mappedData => {
      results = mappedData;
      
      store.clear();
      return tx.complete;
    }).then(result => {
      return results;
    }).catch(error => {
      return [];
    });
  }

  static saveRestaurantData(restaurant) {
    if (!restaurant)
      return restaurant;

    if (!('indexedDB' in window)) {
      return restaurant;
    }

    var dbPromise = DBHelper.openRestaurantsDB();

    return dbPromise.then(function(db) {
      var tx = db.transaction('restaurants', 'readwrite');
      var store = tx.objectStore('restaurants');
      var item = {
        id : restaurant.id,
        data: restaurant
      };
      store.put(item);
      return tx.complete;
    }).then(function(result) {
      return restaurant;
    });
  }

  static loadRestaurantsData() {
    if (!('indexedDB' in window)) {
      return fetch(DBHelper.DATABASE_URL).then((data) => {
        return data.json();
      });
    }

    var dbPromise = DBHelper.openRestaurantsDB();

    return dbPromise.then(function(db) {
      var tx = db.transaction('restaurants', 'readwrite');
      var store = tx.objectStore('restaurants');
      return store.getAll();
    }).then(function(dbData) {
      if (!dbData || dbData.length === 0) {
        return fetch(DBHelper.DATABASE_URL).then((data) => {
          return data.json();
        }).then(function(fetchedData) {
          return dbPromise.then(function(db) {
            var tx = db.transaction('restaurants', 'readwrite');
            var store = tx.objectStore('restaurants');

            fetchedData.forEach(restaurant => {
              var item = {
                id : restaurant.id,
                data: restaurant
              };
              store.add(item);
            });

            
            return tx.complete;
          }).then(function(result) {
            return fetchedData;
          });
        });
      }
      return dbData.map(current => current.data);
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    return DBHelper.loadRestaurantsData()
    .then((data) => {
      callback(null, data);
    })
    .catch((error) => {
      callback(error, null);
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    let name = restaurant.photograph ? `${restaurant.photograph}` : null;
    if (!name) {
      name = `${restaurant.id}`;
    }
    if (name.indexOf('.jpg') === -1) {
      name += '.jpg';
    }
    return (`/img/${name}`);
  }

  /**
   * Restaurant image srcset URLs.
   */
  static imageSrcSetUrlsForRestaurant(restaurant) {
    const imgSrc = DBHelper.imageUrlForRestaurant(restaurant);
    const imgSrcSmall = imgSrc.replace('.jpg', '-small.jpg');
    return `${imgSrcSmall} 400w, ${imgSrc}`;
  }

  static favoriteIconForRestaurant(restaurant) {
    if (DBHelper.isRestaurantFavorite(restaurant)) {
      return './img/favorite.svg';
    }

    return './img/add-favorite.svg';
  }

  static isRestaurantFavorite(restaurant) {
    if (restaurant && (restaurant.is_favorite === 'true' || restaurant.is_favorite === true)) {
      return true;
    }

    return false;
  }

  /**
   * Restaurant image ALT text.
   */
  static imageAltForRestaurant(restaurant) {
    return (`Restaurant, ${restaurant.name}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
