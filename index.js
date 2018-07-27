const Base = require('ninjakatt-plugin-base');
const axios = require('axios');
const { zeroBefore } = require(`${global.appRoot}/lib/helpers`);
const emitter = global.emitter;

module.exports = class Epcheckr extends Base {
  constructor() {
    super(__dirname);
    this.setupListeners();
  }

  setup() {
    if (this.settings.shows.categories.length) {
      this.getFollowedShows();
      emitter.emit(
        'message',
        `Started epcheckr shows timer (${this.settings.shows.updateInterval}m)`,
        'start',
        Epcheckr.name
      );
      this.showsTimer();
    }
  }

  showsTimer() {
    setTimeout(() => {
      this.getFollowedShows();
    }, this.settings.shows.updateInterval * 1000 * 60);
  }

  async getFollowedShows() {
    const settings = this.settings;
    const categories = settings.shows.categories;
    const shows = await axios
      .get(
        `${settings.apiUrl}/user/latest/${categories.join('-')}?apikey=${
          settings.apiKey
        }`
      )
      .then(response =>
        response.data.map(entry => entry.name.replace(/\./g, ' '))
      )
      .catch(error => {
        emitter.emit(
          'message',
          'Error getting shows from epchecker',
          'error',
          Epcheckr.name
        );
      });

    emitter.emit('torrentrss.add-show', shows);
    this.showsTimer();
  }

  async scrobbleEpisode(details) {
    const settings = this.settings;
    const path = `${settings.apiUrl}/user/mark/${details.tvdbid}/${
      details.item.season
    }/${details.item.episode}?apikey=${settings.apiKey}`;
    const response = await axios.get(path).then(res => res.data);

    emitter.emit(
      'message',
      `Scrobbled ${details.item.showtitle} s${zeroBefore(
        details.item.season
      )}e${zeroBefore(details.item.episode)}.`,
      'add',
      Epcheckr.name
    );

    return response;
  }

  setupListeners() {
    emitter.register(
      'kodi.completed.episode',
      details => {
        this.scrobbleEpisode(details);
      },
      Epcheckr.name
    );
  }
};
