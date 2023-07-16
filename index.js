require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

const cors = require('cors');

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lsigos1.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const db = client.db('britania');
    const bookCollection = db.collection('books');
    const userCollection = db.collection('users');

    app.get('/books', async (req, res) => {
      const cursor = bookCollection.find({}).sort({ _id: -1 })
      const book = await cursor.toArray();

      res.send({ status: true, data: book });
    });

    app.get('/book/:id', async (req, res) => {
      const result = await bookCollection.findOne({ _id: ObjectId(req.params.id) })
      res.send({
        status: true,
        data: result
      })
    })

    app.post('/book', async (req, res) => {
      const data = { ...req.body, reviews: [] }

      const result = await bookCollection.insertOne(data)
      res.send({
        status: true, data: result.insertedId
      })
    })

    app.patch('/book/:id', async (req, res) => {
      const { ...data } = req.body

      const result = await bookCollection.updateOne({ _id: ObjectId(req.params.id) }, { $set: data })
      res.send({
        status: true, data: result.upsertedId
      })
    })

    app.delete('/book/:id', async (req, res) => {
      const id = req.params.id;
      const result = await bookCollection.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });

    app.get('/review/:id', async (req, res) => {
      const bookId = req.params.id;

      const result = await bookCollection.findOne(
        { _id: ObjectId(bookId) },
        { projection: { _id: 0, reviews: 1 } }
      );

      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: 'Book not found' });
      }
    });

    app.post('/review/:id', async (req, res) => {
      const bookId = req.params.id;
      const review = req.body.review;

      const result = await bookCollection.updateOne(
        { _id: ObjectId(bookId) },
        { $push: { reviews: review } }
      );

      if (result.modifiedCount !== 1) {
        res.json({ error: 'Product not found or comment not added' });
        return;
      }
      res.json({ message: 'Comment added successfully' });
    });

    app.post('/user', async (req, res) => {
      const data = req.body
      const result = await userCollection.insertOne({ ...data, wishlist: [], reading: [] })
      res.send({
        status: true,
        data: result.insertedId
      })
    })

    app.post('/wishlist/:email', async (req, res) => {
      const data = req.body

      const user = await userCollection.findOne({ email: req.params.email });

      const bookAlreadyInWishlist = user.wishlist.some(book => book._id.toString() === data._id);

      if (bookAlreadyInWishlist) {
        return res.status(409).json({ status: false, message: 'Book already in the wishlist' });
      }

      const result = await userCollection.updateOne({ email: req.params.email }, { $push: { wishlist: data } });
      res.send({
        status: true,
        data: result.upsertedId
      })
    })

    app.get('/wishlist/:email', async (req, res) => {
      const result = await userCollection.findOne({ email: req.params.email }, { projection: { _id: 0, wishlist: 1 } });

      res.send({
        status: true,
        data: result
      })
    })

    app.post('/reading/:email', async (req, res) => {
      const data = req.body

      const user = await userCollection.findOne({ email: req.params.email });

      const bookAlreadyInWishlist = user.reading.some(book => book._id.toString() === data._id);

      if (bookAlreadyInWishlist) {
        return res.status(409).json({ status: false, message: 'Book already in the reading list' });
      }

      const result = await userCollection.updateOne({ email: req.params.email }, { $push: { reading: { ...data, completed: false } } });
      res.send({
        status: true,
        data: result.upsertedId
      })
    })

    app.get('/reading/:email', async (req, res) => {
      const result = await userCollection.findOne({ email: req.params.email }, { projection: { _id: 0, reading: 1 } });

      res.send({
        status: true,
        data: result
      })
    })

    app.patch('/complete/:email', async (req, res) => {
      const book = req.body;
      const userEmail = req.params.email

      console.log(book)


      const user = await userCollection.findOne({ email: userEmail });

      const bookToUpdate = user.reading.find(book => book._id.toString() === book?._id);

      bookToUpdate.completed = true;
      await userCollection.updateOne({ email: userEmail }, { $set: { reading: user.reading } });

      res.status(200).json({ status: true, data: user.reading });
    })


  } finally {
  }
};

run().catch((err) => console.log(err));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
