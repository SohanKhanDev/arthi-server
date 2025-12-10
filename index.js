require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf-8"
);
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use(express.json());

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];
  // console.log(token);
  if (!token) return res.status(401).send({ message: "Unauthorized Access!" });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;
    // console.log(decoded);
    next();
  } catch (err) {
    // console.log(err);
    return res.status(401).send({ message: "Unauthorized Access!", err });
  }
};

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const db = client.db("arthi_DB");
    const usersCollection = db.collection("users");
    const loansCollection = db.collection("loans");
    const loanApplicationsCollection = db.collection("loanApplications");

    // add loans application
    app.post("/apply-loan", async (req, res) => {
      const rcvData = req.body;
      const {
        title,
        interestRate,
        first_name,
        last_name,
        address,
        contact_no,
        nid_no,
        income_source,
        monthly_income,
        loan_amount,
        loan_reason,
        notes,
        requestBy,
      } = rcvData;

      const applicationData = {
        title,
        interestRate: parseFloat(interestRate),
        first_name,
        last_name,
        address,
        contact_no,
        nid_no,
        income_source,
        monthly_income: parseFloat(monthly_income),
        loan_amount: parseFloat(loan_amount),
        loan_reason,
        notes,
        status: "pending",
        fee_status: "unpaid",
        requestBy,
        createdAt: new Date(),
      };

      console.log(applicationData);
      const result = await loanApplicationsCollection.insertOne(
        applicationData
      );
      res.send(result);
    });

    // get loans application by requestBy
    app.get("/loan-applications/:email", async (req, res) => {
      const rcvData = req.params.email;
      console.log(rcvData);
      const result = await loanApplicationsCollection
        .find({ requestBy: rcvData })
        .toArray();
      res.send(result);
    });

    app.patch("/application/:id", async (req, res) => {
      const rcvData = req.params.id;
      const appID = new ObjectId(rcvData);
      const result = await loanApplicationsCollection.updateOne(
        { _id: appID },
        {
          $set: {
            status: "canceled",
          },
        }
      );
      res.send(result);
    });

    // add loans
    app.post("/addloans", async (req, res) => {
      const rcvData = req.body;
      const {
        title,
        description,
        category,
        interestRate,
        maxLoanLimit,
        requiredDocuments,
        emiPlans,
        showOnHome,
        image,
      } = rcvData;

      const loanData = {
        title,
        description,
        category,
        interestRate: parseFloat(interestRate),
        maxLoanLimit: parseFloat(maxLoanLimit),
        requiredDocuments,
        emiPlans: parseFloat(emiPlans),
        showOnHome,
        image,
        createdAt: new Date(),
      };

      const result = await loansCollection.insertOne(loanData);
      res.send(result);
    });

    // delete loans
    app.delete("/loans/:id", async (req, res) => {
      const rcvData = req.params.id;
      const deleteID = new ObjectId(rcvData);
      const result = await loansCollection.deleteOne({ _id: deleteID });
      res.send(result);
    });

    // delete loans
    app.patch("/loans/:id", async (req, res) => {
      const rcvID = req.params.id;
      const updateID = new ObjectId(rcvID);

      const rcvData = req.body;
      console.log({ updateID, rcvData });
      const result = await loansCollection.updateOne(
        { _id: updateID },
        { $set: rcvData }
      );
      res.send(result);
    });

    // get all loans
    app.get("/loans", async (req, res) => {
      const result = await loansCollection.find().toArray();
      res.send(result);
    });

    // get specific loan
    app.get("/loan/:id", async (req, res) => {
      const rcvData = req.params.id;
      const userID = new ObjectId(rcvData);
      const result = await loansCollection.findOne({ _id: userID });
      res.send(result);
    });

    // save or update user
    app.post("/users", async (req, res) => {
      const userData = req.body;
      userData.createdAt = new Date().toISOString();
      userData.lastLoogedIn = new Date().toISOString();

      if (userData.role !== "borrower") {
        userData.status = "pending";
      } else {
        userData.status = "approved";
      }

      const filter = { email: userData.email };
      const alreadyExists = await usersCollection.findOne(filter);

      if (alreadyExists) {
        const result = await usersCollection.updateOne(filter, {
          $set: { lastLoogedIn: new Date().toISOString() },
        });
        return res.send(result);
      }

      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    // get specific user
    app.get("/users/:email", async (req, res) => {
      const userEmail = req.params.email;
      const result = await usersCollection.findOne({ email: userEmail });
      res.send(result);
    });

    // get all user
    app.get("/users", verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // get specific user
    app.get("/db-user", verifyJWT, async (req, res) => {
      const userEmail = req.tokenEmail;
      const result = await usersCollection.findOne({ email: userEmail });
      res.send(result);
    });

    // update user name & photo
    app.patch("/users-update", async (req, res) => {
      const userData = req.body;
      const { name, image, email } = userData;
      const result = await usersCollection.updateOne(
        { email: email },
        {
          $set: {
            name: name,
            image: image,
          },
        }
      );
      res.send(result);
    });

    // update user last login time
    app.patch("/users/login-update/:id", async (req, res) => {
      const userData = req.params.id;
      const userID = new ObjectId(userData);
      const result = await usersCollection.updateOne(
        { _id: userID },
        {
          $set: {
            lastLoogedIn: new Date().toISOString(),
          },
        }
      );
      res.send(result);
    });

    // update user role
    app.patch("/update-role", async (req, res) => {
      const userData = req.body;
      const { email, role } = userData;
      console.log({ email, role });

      const result = await usersCollection.updateOne(
        { email: email },
        {
          $set: {
            role: role,
          },
        }
      );
      res.send(result);
    });

    // update user status to suspend
    app.patch("/users/suspend/:id", async (req, res) => {
      const userData = req.params.id;
      const userID = new ObjectId(userData);
      const { suspendReason } = req.body;

      const result = await usersCollection.updateOne(
        { _id: userID },
        {
          $set: {
            status: "suspended",
            suspendReason: suspendReason,
          },
        }
      );
      res.send(result);
    });

    // update user status to suspend
    app.patch("/users/approve/:id", async (req, res) => {
      const userData = req.params.id;
      const userID = new ObjectId(userData);
      const result = await usersCollection.updateOne(
        { _id: userID },
        {
          $set: {
            status: "approved",
          },
        }
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Arthi Server is Running!!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
