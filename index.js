const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mhybc4g.mongodb.net/?retryWrites=true&w=majority`
app.use(express.json());
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        await client.connect();
        console.log('Database connected');
        const itemCollection = client.db('bits-and-bytes').collection('items');
        const orderCollection = client.db('bits-and-bytes').collection('orders');
        const userCollection = client.db('bits-and-bytes').collection('users');

        app.get('/item', async (req, res) => {
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        });

        app.post('/item', async (req, res) => {
            const item = req.body;
            const result = await itemCollection.insertOne(item);
            res.send(result);


        });
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin'
            res.send({ admin: isAdmin })
        })


        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester })
            const filter = { email: email };
            if (requesterAccount.role == 'admin') {
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }

        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
            res.send({ result, token });
        });

        app.get('/order', verifyJWT, async (req, res) => {
            const userEmail = req.query.userEmail;
            const decodedEmail = req.decoded.email;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const order = await orderCollection.find(query).toArray();
                return res.send(order);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }

        })



        app.get('/item/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const item = await itemCollection.findOne(query);
            res.send(item);
        });


        app.post('/order', async (req, res) => {
            const order = req.body;
            if (order.quantityItem < order.minQuantity || order.quantityItem > order.availableQuantity) {
                const query = { quantityItem: order.quantityItem, minQuantity: order.minQuantity, availableQuantity: order.availableQuantity }
                const exists = await orderCollection.findOne(query);
                return res.send({ success: false, order: exists })



            }
            const result = await orderCollection.insertOne(order);
            return res.send({ success: true, result });


        });


    }
    finally {

    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello From Bits and Bytes!')
})

app.listen(port, () => {
    console.log(`Bits and Bytes App listening on port ${port}`)
})