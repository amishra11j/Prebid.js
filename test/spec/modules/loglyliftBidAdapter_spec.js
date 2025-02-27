import { expect } from 'chai';
import { spec } from '../../../modules/loglyliftBidAdapter';
import * as utils from 'src/utils.js';

describe('loglyliftBidAdapter', function () {
  const nativeBidRequests = [{
    bidder: 'loglylift',
    bidId: '254304ac29e265',
    params: {
      adspotId: 16
    },
    adUnitCode: '/19968336/prebid_native_example_1',
    transactionId: '10aee457-617c-4572-ab5b-99df1d73ccb4',
    sizes: [
      []
    ],
    bidderRequestId: '15da3afd9632d7',
    auctionId: 'f890b7d9-e787-4237-ac21-6d8554abac9f',
    mediaTypes: {
      native: {
        body: {
          required: true
        },
        icon: {
          required: false
        },
        title: {
          required: true
        },
        image: {
          required: true
        },
        sponsoredBy: {
          required: true
        }
      }
    }
  }];

  const bidderRequest = {
    refererInfo: {
      referer: 'fakeReferer',
      reachedTop: true,
      numIframes: 1,
      stack: []
    },
    auctionStart: 1632194172781,
    bidderCode: 'loglylift',
    bidderRequestId: '15da3afd9632d7',
    auctionId: 'f890b7d9-e787-4237-ac21-6d8554abac9f',
    timeout: 3000
  };

  const nativeServerResponse = {
    body: {
      bids: [{
        requestId: '254304ac29e265',
        cpm: 10.123,
        width: 360,
        height: 360,
        creativeId: '123456789',
        currency: 'JPY',
        netRevenue: true,
        ttl: 30,
        meta: {
          advertiserDomains: ['advertiserexample.com']
        },
        native: {
          clickUrl: 'https://dsp.logly.co.jp/click?ad=EXAMPECLICKURL',
          image: {
            url: 'https://cdn.logly.co.jp/images/000/194/300/normal.jpg',
            width: '360',
            height: '360'
          },
          impressionTrackers: [
            'https://b.logly.co.jp/sorry.html'
          ],
          sponsoredBy: 'logly',
          title: 'Native Title',
        }
      }],
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true if the adspotId parameter is present', function () {
      expect(spec.isBidRequestValid(nativeBidRequests[0])).to.be.true;
    });

    it('should return false if the adspotId parameter is not present', function () {
      let bidRequest = utils.deepClone(nativeBidRequests[0]);
      delete bidRequest.params.adspotId;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should generate a valid single POST request for multiple bid requests', function () {
      const request = spec.buildRequests(nativeBidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://bid.logly.co.jp/prebid/client/v1?adspot_id=16');
      expect(request.data).to.exist;

      const data = JSON.parse(request.data);
      expect(data.auctionId).to.equal(nativeBidRequests[0].auctionId);
      expect(data.bidderRequestId).to.equal(nativeBidRequests[0].bidderRequestId);
      expect(data.transactionId).to.equal(nativeBidRequests[0].transactionId);
      expect(data.adUnitCode).to.equal(nativeBidRequests[0].adUnitCode);
      expect(data.bidId).to.equal(nativeBidRequests[0].bidId);
      expect(data.mediaTypes).to.deep.equal(nativeBidRequests[0].mediaTypes);
      expect(data.params).to.deep.equal(nativeBidRequests[0].params);
      expect(data.prebidJsVersion).to.equal('6.5.0-pre');
      expect(data.url).to.exist;
      expect(data.domain).to.exist;
      expect(data.referer).to.equal(bidderRequest.refererInfo.referer);
      expect(data.auctionStartTime).to.equal(bidderRequest.auctionStart);
      expect(data.currency).to.exist;
      expect(data.timeout).to.equal(bidderRequest.timeout);
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array if an invalid response is passed', function () {
      const interpretedResponse = spec.interpretResponse({}, {});
      expect(interpretedResponse).to.be.an('array').that.is.empty;
    });

    it('should return valid response when passed valid server response', function () {
      const request = spec.buildRequests(nativeBidRequests, bidderRequest)[0];
      const interpretedResponse = spec.interpretResponse(nativeServerResponse, request);

      expect(interpretedResponse).to.have.lengthOf(1);
      expect(interpretedResponse[0].cpm).to.equal(nativeServerResponse.body.bids[0].cpm);
      expect(interpretedResponse[0].width).to.equal(nativeServerResponse.body.bids[0].width);
      expect(interpretedResponse[0].height).to.equal(nativeServerResponse.body.bids[0].height);
      expect(interpretedResponse[0].creativeId).to.equal(nativeServerResponse.body.bids[0].creativeId);
      expect(interpretedResponse[0].currency).to.equal(nativeServerResponse.body.bids[0].currency);
      expect(interpretedResponse[0].netRevenue).to.equal(nativeServerResponse.body.bids[0].netRevenue);
      expect(interpretedResponse[0].ttl).to.equal(nativeServerResponse.body.bids[0].ttl);
      expect(interpretedResponse[0].native).to.deep.equal(nativeServerResponse.body.bids[0].native);
      expect(interpretedResponse[0].meta.advertiserDomains[0]).to.equal(nativeServerResponse.body.bids[0].meta.advertiserDomains[0]);
    });
  });

  describe('getUserSync tests', function () {
    it('UserSync test : check type = iframe, check usermatch URL', function () {
      const syncOptions = {
        'iframeEnabled': true
      }
      let userSync = spec.getUserSyncs(syncOptions, [nativeServerResponse]);
      expect(userSync[0].type).to.equal('iframe');
      const USER_SYNC_URL = 'https://sync.logly.co.jp/sync/sync.html';
      expect(userSync[0].url).to.equal(USER_SYNC_URL);
    });

    it('When iframeEnabled is false, no userSync should be returned', function () {
      const syncOptions = {
        'iframeEnabled': false
      }
      let userSync = spec.getUserSyncs(syncOptions, [nativeServerResponse]);
      expect(userSync).to.be.an('array').that.is.empty;
    });

    it('When nativeServerResponses empty, no userSync should be returned', function () {
      const syncOptions = {
        'iframeEnabled': false
      }
      let userSync = spec.getUserSyncs(syncOptions, []);
      expect(userSync).to.be.an('array').that.is.empty;
    });
  });
});
