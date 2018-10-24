import sys
import cPickle
import struct
import json

payload = open(sys.argv[1], 'rb').read()
packFormat = '!L'
headerLen = struct.calcsize(packFormat)
payloadLen, = struct.unpack(packFormat, payload[:headerLen])
batchLen = headerLen + payloadLen
metrics = cPickle.loads(payload[headerLen:batchLen])
print json.dumps(metrics)
