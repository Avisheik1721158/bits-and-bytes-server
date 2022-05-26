const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mhybc4g.mongodb.net/?retryWrites=true&w=majority`
app.use(express.json());
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        console.log('Database connected');
        const itemCollection = client.db('bits-and-bytes').collection('items');
        const orderCollection = client.db('bits-and-bytes').collection('orders');

        app.get('/item', async (req, res) => {
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        });

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