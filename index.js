const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken')
const cookieParser = require("cookie-parser");
const app = express();
require("dotenv").config();
const cors=require("cors")
const port = process.env.PORT || 5000;


const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://solosphere-10349.web.app",
  ],
  credentials: true,
  
};

// middleware 
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// console.log(process.env.DB_USER);


// verify middleware 
const verifyToken = async (req, res, next) => {
  const token = req?.cookies.token
  // console.log('token:',token);
  if(!token) return res.status(401).send({ message: "unauthorized access" });

  if (token) {
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded)=>{
      if (err) {
        console.log( err);
        return res.status(401).send({message:'unauthorized access'})
      }
      console.log("decoded Data:=>>",decoded);
      req.user = decoded
      
      next()
    });
  }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yjkegcv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const jobsCollection=client.db('soloSphere').collection('jobs')
    const bidsCollection = client.db('soloSphere').collection('bids')

    

    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn:"1d"
      })
      
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production"?"none":"strict"
      })
        .send({message:true})
    })

    app.get('/logout', async (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge:0
      })
      .send({message:true})
    })




    app.post('/job', async (req, res) => {
      const job = req.body;
      // console.log(job);
      const result = await jobsCollection.insertOne(job)
      res.send(result)
    })

    app.get('/jobs', async (req, res) => {
      const cursor = jobsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.get("/jobs/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      console.log(tokenEmail);
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { "buyer.email": email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/job/:id", async (req, res) => {
      const id = req.params.id;
      const userData = req.body;
      console.log(userData);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...userData,
        },
      };
      const result = await jobsCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.delete('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query)
      res.send(result);
    })




    // bid collection

    app.post('/bids', async (req, res) => {
      const bid = req.body;
      const result = await bidsCollection.insertOne(bid)
      res.send(result)
    })
    app.get("/bids/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/bid-request/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "buyer.email": email };
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/bid/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const status = req.body;
      const updateDoc = {
        $set: status,
      };
      const result = await bidsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });





    // get All pagination data
    app.get("/all-jobs", async (req, res) => { 
      const page = parseInt(req.query.page)-1;
      const size = parseInt(req.query.size);
      console.log(page,size);
       const result = await jobsCollection.find().limit(size).toArray()
       res.send(result);
     });
    

    // get All Count data 
      app.get("/jobs-count", async (req, res) => {
        const count = await jobsCollection.countDocuments()
        res.send({count});
      });


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("soloSphere is comming");
});

app.listen(port, () => {
  console.log(`soloSphere is running on port ${port}`);
});
